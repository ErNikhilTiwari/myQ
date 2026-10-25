import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';

describe('Appointment Booking Rules (Past Date, 2-Day Horizon, Overlap Protections)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let clinicA: any;
  let doctorA: any;
  let patientToken1: string;
  let patientToken2: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    prisma = app.get(PrismaService);

    clinicA = await prisma.clinic.findFirst({ orderBy: { createdAt: 'asc' } });
    doctorA = await prisma.doctor.findFirst({ where: { clinicId: clinicA.id } });

    // Clean existing test appointments
    await prisma.appointment.deleteMany({ where: { clinicId: clinicA.id } });

    // Patient 1 (+919876543210)
    await prisma.oTPVerification.create({
      data: {
        phoneNumber: '+919876543210',
        hashedOtp: '$2a$10$dummyHash',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });
    const pat1Res = await request(app.getHttpServer())
      .post('/api/auth/verify-otp')
      .send({ phoneNumber: '+919876543210', otp: '123456' });
    patientToken1 = pat1Res.body.data.tokens.accessToken;

    // Patient 2 (+919876543211)
    await prisma.oTPVerification.create({
      data: {
        phoneNumber: '+919876543211',
        hashedOtp: '$2a$10$dummyHash',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });
    const pat2Res = await request(app.getHttpServer())
      .post('/api/auth/verify-otp')
      .send({ phoneNumber: '+919876543211', otp: '123456' });
    patientToken2 = pat2Res.body.data.tokens.accessToken;
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('Rule 1: Rejects booking for past date/time with 400 Bad Request', async () => {
    const pastSlot = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago

    const res = await request(app.getHttpServer())
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken1}`)
      .send({
        clinicId: clinicA.id,
        doctorId: doctorA.id,
        slotTime: pastSlot,
      })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('past date or time');
  });

  it('Rule 2: Rejects booking beyond 2 days in advance with 400 Bad Request', async () => {
    const fourDaysAhead = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString();

    const res = await request(app.getHttpServer())
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken1}`)
      .send({
        clinicId: clinicA.id,
        doctorId: doctorA.id,
        slotTime: fourDaysAhead,
      })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('today or up to 2 days in advance');
  });

  it('Rule 3A: Successfully books a valid future slot within 2-day horizon', async () => {
    const slotTomorrow = new Date();
    slotTomorrow.setDate(slotTomorrow.getDate() + 1);
    slotTomorrow.setHours(10, 30, 0, 0);
    const validSlotTomorrow = slotTomorrow.toISOString();

    const res = await request(app.getHttpServer())
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken1}`)
      .send({
        clinicId: clinicA.id,
        doctorId: doctorA.id,
        slotTime: validSlotTomorrow,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.bookingFee).toBe(200);
  });

  it('Rule 3B: Rejects patient attempting to book overlapping slot for themselves with 409 Conflict', async () => {
    const slotTomorrow = new Date();
    slotTomorrow.setDate(slotTomorrow.getDate() + 1);
    slotTomorrow.setHours(10, 30, 0, 0);
    const validSlotTomorrow = slotTomorrow.toISOString();

    const res = await request(app.getHttpServer())
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken1}`)
      .send({
        clinicId: clinicA.id,
        doctorId: doctorA.id,
        slotTime: validSlotTomorrow,
      })
      .expect(409);

    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('already booked');
  });

  it('Rule 3C: Rejects another patient booking the same doctor at the same slot with 409 Conflict', async () => {
    const slotTomorrow = new Date();
    slotTomorrow.setDate(slotTomorrow.getDate() + 1);
    slotTomorrow.setHours(10, 30, 0, 0);
    const validSlotTomorrow = slotTomorrow.toISOString();

    const res = await request(app.getHttpServer())
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken2}`)
      .send({
        clinicId: clinicA.id,
        doctorId: doctorA.id,
        slotTime: validSlotTomorrow,
      })
      .expect(409);

    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('already booked');
  });

  it('Rule 3D: Allows patient to book multiple appointments with no restriction for different slots', async () => {
    const slotTomorrow2 = new Date();
    slotTomorrow2.setDate(slotTomorrow2.getDate() + 1);
    slotTomorrow2.setHours(11, 30, 0, 0);
    const validSlotTomorrow2 = slotTomorrow2.toISOString();

    // Patient 1 books a second appointment for another slot
    const res = await request(app.getHttpServer())
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken1}`)
      .send({
        clinicId: clinicA.id,
        doctorId: doctorA.id,
        slotTime: validSlotTomorrow2,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();

    // Patient 1 now has 2 confirmed/pending appointments
    const myAppts = await prisma.appointment.findMany({
      where: {
        userId: res.body.data.userId,
        status: { in: ['CONFIRMED', 'PENDING'] },
      },
    });
    expect(myAppts.length).toBe(2);
  });
});
