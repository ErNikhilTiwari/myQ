import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';

describe('Clinic Admin Schedule, Holiday Calendar & Queue Date Isolation (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let clinic: any;
  let doctor: any;
  let queue: any;
  let adminToken: string;
  let patientToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    prisma = app.get(PrismaService);

    clinic = await prisma.clinic.findUnique({ where: { slug: 'abc-health' } });
    doctor = await prisma.doctor.findFirst({ where: { clinicId: clinic.id } });
    queue = await prisma.queue.findFirst({ where: { doctorId: doctor.id } });

    // Clean existing appointments and test queue entries
    await prisma.appointment.deleteMany({ where: { clinicId: clinic.id } });
    await prisma.queueEntry.deleteMany({ where: { queueId: queue.id } });

    // Login Clinic Admin (+919876500002)
    await prisma.oTPVerification.create({
      data: {
        phoneNumber: '+919876500002',
        hashedOtp: '$2a$10$dummyHash',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });
    const adminRes = await request(app.getHttpServer())
      .post('/api/auth/verify-otp')
      .send({ phoneNumber: '+919876500002', otp: '123456' });
    adminToken = adminRes.body.data.tokens.accessToken;

    // Login Patient (+919876543210)
    await prisma.oTPVerification.create({
      data: {
        phoneNumber: '+919876543210',
        hashedOtp: '$2a$10$dummyHash',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });
    const patRes = await request(app.getHttpServer())
      .post('/api/auth/verify-otp')
      .send({ phoneNumber: '+919876543210', otp: '123456' });
    patientToken = patRes.body.data.tokens.accessToken;

    // Ensure patient profile has demographics (age, gender)
    const patUser = await prisma.user.findUnique({ where: { phoneNumber: '+919876543210' } });
    await prisma.patientProfile.upsert({
      where: { userId: patUser.id },
      update: { age: 29, gender: 'MALE' },
      create: { userId: patUser.id, age: 29, gender: 'MALE' },
    });
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('1. Clinic Admin sets operating hours, working days, and marks holidays for current & next month', async () => {
    const tz = 'Asia/Kolkata';
    const tomorrowObj = new Date();
    tomorrowObj.setDate(tomorrowObj.getDate() + 1);
    const tomorrowStr = tomorrowObj.toLocaleDateString('en-CA', { timeZone: tz });

    const patchRes = await request(app.getHttpServer())
      .patch(`/api/clinics/${clinic.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        workingDays: 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY',
        openTime: '08:30 AM',
        closeTime: '07:30 PM',
        holidays: JSON.stringify([tomorrowStr]),
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.success).toBe(true);

    // Verify stored fields in database
    const updated = await prisma.clinic.findUnique({ where: { id: clinic.id } });
    expect(updated.openTime).toBe('08:30 AM');
    expect(updated.closeTime).toBe('07:30 PM');
    expect(updated.workingDays).toContain('MONDAY');
    expect(updated.holidays).toContain(tomorrowStr);
  });

  it('2. Patient booking is rejected when attempting to book on a marked holiday', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(11, 0, 0, 0);

    const res = await request(app.getHttpServer())
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        doctorId: doctor.id,
        slotTime: tomorrow.toISOString(),
        bookingType: 'REMOTE',
        joinQueueImmediately: false,
      });

    expect(res.status).toBe(400);
    expect(res.body.error?.message || res.body.message).toContain('holiday');
  });

  it('3. Patient books for Today, and queue details isolates Today vs Tomorrow', async () => {
    // Unmark tomorrow as holiday so standard tests run smoothly
    await prisma.clinic.update({
      where: { id: clinic.id },
      data: { holidays: '[]', workingDays: 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY,SUNDAY' },
    });

    const todaySlot = new Date();
    todaySlot.setHours(todaySlot.getHours() + 1, 0, 0, 0);
    const todayDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    // Book today's appointment with instant priority queue pass
    const bookRes = await request(app.getHttpServer())
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        doctorId: doctor.id,
        slotTime: todaySlot.toISOString(),
        bookingType: 'REMOTE',
        joinQueueImmediately: true,
      });

    expect(bookRes.status).toBe(201);

    // Fetch Today's Queue with date query param
    const queueTodayRes = await request(app.getHttpServer())
      .get(`/api/clinics/${clinic.id}/queues/${queue.id}?date=${todayDateStr}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(queueTodayRes.status).toBe(200);
    expect(queueTodayRes.body.success).toBe(true);

    const todayData = queueTodayRes.body.data;
    const allTodayEntries = [...todayData.waiting, ...todayData.booked];
    expect(allTodayEntries.length).toBeGreaterThan(0);

    // Detailed patient metadata assertion
    const matchedEntry = allTodayEntries.find((e: any) => e.patientName && e.phoneNumber === '+919876543210');
    expect(matchedEntry).toBeDefined();
    expect(matchedEntry.bookingDate).toBeDefined();
    expect(matchedEntry.bookingTime).toBeDefined();
    expect(matchedEntry.slotTime).toBeDefined();
    expect(matchedEntry.isPriority).toBe(true);
    expect(matchedEntry.age).toBe(29);
    expect(matchedEntry.gender).toBe('MALE');

    // Fetch Tomorrow's Queue with date query param
    const tomorrowObj = new Date();
    tomorrowObj.setDate(tomorrowObj.getDate() + 1);
    const tomorrowDateStr = tomorrowObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    const queueTomorrowRes = await request(app.getHttpServer())
      .get(`/api/clinics/${clinic.id}/queues/${queue.id}?date=${tomorrowDateStr}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(queueTomorrowRes.status).toBe(200);
    const tomorrowData = queueTomorrowRes.body.data;
    // Today's patient should NOT be in tomorrow's queue
    const inTomorrow = [...tomorrowData.waiting, ...tomorrowData.booked].find(
      (e: any) => e.phoneNumber === '+919876543210',
    );
    expect(inTomorrow).toBeUndefined();
  });
});
