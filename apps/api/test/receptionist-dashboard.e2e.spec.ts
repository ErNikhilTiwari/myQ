import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { QueueEntryStatus } from '@queueapp/shared';

describe('Receptionist Dashboard & Full-Day Simulation (E2E Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let clinicA: any;
  let queueA: any;
  let receptionistAToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    prisma = app.get(PrismaService);

    // Fetch seeded clinic A and queue
    clinicA = await prisma.clinic.findUnique({ where: { slug: 'abc-health' } });
    queueA = await prisma.queue.findFirst({ where: { clinicId: clinicA.id } });

    // Clean queue entries and test walk-in users
    await prisma.queueEntry.deleteMany({ where: { queueId: queueA.id } });
    await prisma.queue.update({ where: { id: queueA.id }, data: { currentSeq: 0 } });
    await prisma.user.deleteMany({
      where: { phoneNumber: { in: ['+919876599001', '+919876599002'] } },
    });

    // Login Receptionist A (+919876500001)
    await prisma.oTPVerification.create({
      data: {
        phoneNumber: '+919876500001',
        hashedOtp: '$2a$10$dummyHash',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    const recRes = await request(app.getHttpServer())
      .post('/api/auth/verify-otp')
      .send({ phoneNumber: '+919876500001', otp: '123456' });
    receptionistAToken = recRes.body.data.tokens.accessToken;
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('1. Fetches initial receptionist daily statistics', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/clinics/${clinicA.id}/receptionist/stats`)
      .set('Authorization', `Bearer ${receptionistAToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.totalTokensToday).toBe(0);
    expect(res.body.data.waitingCount).toBe(0);
  });

  it('2. Registers walk-in patients (new and returning)', async () => {
    // Walk-in 1: New Patient Sunita
    const p1 = await request(app.getHttpServer())
      .post(`/api/clinics/${clinicA.id}/receptionist/walk-in`)
      .set('Authorization', `Bearer ${receptionistAToken}`)
      .send({
        name: 'Sunita Rao',
        phoneNumber: '9876599001', // 10-digit format
        queueId: queueA.id,
        tokenPrefix: 'W',
      })
      .expect(201);

    expect(p1.body.success).toBe(true);
    expect(p1.body.data.entry.tokenNumber).toBe('W-01');
    expect(p1.body.data.isExistingPatient).toBe(false);
    expect(p1.body.data.user.phoneNumber).toBe('+919876599001');

    // Walk-in 2: New Patient Manoj
    const p2 = await request(app.getHttpServer())
      .post(`/api/clinics/${clinicA.id}/receptionist/walk-in`)
      .set('Authorization', `Bearer ${receptionistAToken}`)
      .send({
        name: 'Manoj Kumar',
        phoneNumber: '+919876599002',
        queueId: queueA.id,
        tokenPrefix: 'W',
      })
      .expect(201);

    expect(p2.body.data.entry.tokenNumber).toBe('W-02');

    // Walk-in 3: Returning Patient Sunita (should reuse existing user!)
    const p3 = await request(app.getHttpServer())
      .post(`/api/clinics/${clinicA.id}/receptionist/walk-in`)
      .set('Authorization', `Bearer ${receptionistAToken}`)
      .send({
        name: 'Sunita Rao (Follow-up)',
        phoneNumber: '+919876599001',
        queueId: queueA.id,
        tokenPrefix: 'W',
      })
      .expect(201);

    expect(p3.body.data.entry.tokenNumber).toBe('W-03');
    expect(p3.body.data.isExistingPatient).toBe(true);
    expect(p3.body.data.user.id).toBe(p1.body.data.user.id); // Same user ID preserved!
  });

  it('3. Runs full operational day: Call Next, Put on Hold, Recall, and Complete all', async () => {
    // Call 1st patient (W-01)
    const call1 = await request(app.getHttpServer())
      .post(`/api/clinics/${clinicA.id}/queues/${queueA.id}/call-next`)
      .set('Authorization', `Bearer ${receptionistAToken}`)
      .expect(200);

    expect(call1.body.data.calledEntry.tokenNumber).toBe('W-01');
    const tokenW01Id = call1.body.data.calledEntry.id;

    // Put W-01 on hold (Awaiting doctor review)
    await request(app.getHttpServer())
      .post(`/api/clinics/${clinicA.id}/queues/entries/${tokenW01Id}/transition`)
      .set('Authorization', `Bearer ${receptionistAToken}`)
      .send({
        targetStatus: QueueEntryStatus.ON_HOLD,
        holdReason: 'Awaiting ECG result',
      })
      .expect(200);

    // Verify stats shows 1 on hold, 2 waiting
    let stats = await request(app.getHttpServer())
      .get(`/api/clinics/${clinicA.id}/receptionist/stats`)
      .set('Authorization', `Bearer ${receptionistAToken}`)
      .expect(200);

    expect(stats.body.data.onHoldCount).toBe(1);
    expect(stats.body.data.waitingCount).toBe(2);

    // Call Next patient (W-02)
    const call2 = await request(app.getHttpServer())
      .post(`/api/clinics/${clinicA.id}/queues/${queueA.id}/call-next`)
      .set('Authorization', `Bearer ${receptionistAToken}`)
      .expect(200);

    expect(call2.body.data.calledEntry.tokenNumber).toBe('W-02');
    const tokenW02Id = call2.body.data.calledEntry.id;

    // Complete W-02
    await request(app.getHttpServer())
      .post(`/api/clinics/${clinicA.id}/queues/entries/${tokenW02Id}/transition`)
      .set('Authorization', `Bearer ${receptionistAToken}`)
      .send({ targetStatus: QueueEntryStatus.COMPLETED })
      .expect(200);

    // Recall W-01 from hold
    await request(app.getHttpServer())
      .post(`/api/clinics/${clinicA.id}/queues/entries/${tokenW01Id}/transition`)
      .set('Authorization', `Bearer ${receptionistAToken}`)
      .send({ targetStatus: QueueEntryStatus.CALLED })
      .expect(200);

    // Complete W-01
    await request(app.getHttpServer())
      .post(`/api/clinics/${clinicA.id}/queues/entries/${tokenW01Id}/transition`)
      .set('Authorization', `Bearer ${receptionistAToken}`)
      .send({ targetStatus: QueueEntryStatus.COMPLETED })
      .expect(200);

    // Call Next patient (W-03)
    const call3 = await request(app.getHttpServer())
      .post(`/api/clinics/${clinicA.id}/queues/${queueA.id}/call-next`)
      .set('Authorization', `Bearer ${receptionistAToken}`)
      .expect(200);

    expect(call3.body.data.calledEntry.tokenNumber).toBe('W-03');
    const tokenW03Id = call3.body.data.calledEntry.id;

    // Complete W-03
    await request(app.getHttpServer())
      .post(`/api/clinics/${clinicA.id}/queues/entries/${tokenW03Id}/transition`)
      .set('Authorization', `Bearer ${receptionistAToken}`)
      .send({ targetStatus: QueueEntryStatus.COMPLETED })
      .expect(200);

    // 4. Verify Final Daily Metrics (All completed, zero left waiting)
    const finalStats = await request(app.getHttpServer())
      .get(`/api/clinics/${clinicA.id}/receptionist/stats`)
      .set('Authorization', `Bearer ${receptionistAToken}`)
      .expect(200);

    expect(finalStats.body.data.totalTokensToday).toBe(3);
    expect(finalStats.body.data.completedCount).toBe(3);
    expect(finalStats.body.data.waitingCount).toBe(0);
    expect(finalStats.body.data.onHoldCount).toBe(0);
  });
});
