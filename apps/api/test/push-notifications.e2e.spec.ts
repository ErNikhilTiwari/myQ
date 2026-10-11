import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';

describe('Phase 3 — Web Push Notifications (E2E Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let patientToken: string;
  let patientUser: any;
  let receptionistToken: string;
  let clinicA: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    prisma = app.get(PrismaService);
    clinicA = await prisma.clinic.findUnique({ where: { slug: 'abc-health' } });

    // Patient login
    patientUser = await prisma.user.findUnique({ where: { phoneNumber: '+919876543210' } });
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

    // Receptionist login
    await prisma.oTPVerification.create({
      data: {
        phoneNumber: '+919876500001',
        hashedOtp: '$2a$10$dummyHash',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    const recepRes = await request(app.getHttpServer())
      .post('/api/auth/verify-otp')
      .send({ phoneNumber: '+919876500001', otp: '123456' });
    receptionistToken = recepRes.body.data.tokens.accessToken;
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('1. Patient registers Web Push browser subscription endpoint', async () => {
    const testEndpoint = `https://fcm.googleapis.com/fcm/send/test_sub_${Date.now()}`;
    const res = await request(app.getHttpServer())
      .post('/api/push/subscribe')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        endpoint: testEndpoint,
        keys: {
          p256dh: 'BNcRdreAxxxxxxxxxxxxxxxxxxxxx',
          auth: 'tBHxxxxxxxxxxxxxxxxx',
        },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.endpoint).toBe(testEndpoint);
    expect(res.body.data.userId).toBe(patientUser.id);
  });

  it('2. Clinic receptionist dispatches instant push notification alert to patient', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/push/send')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        userId: patientUser.id,
        title: 'Your Turn Is Next!',
        body: 'Please proceed to Room 1 for Dr. Rajesh Sharma.',
        data: { tokenNumber: 'A-01' },
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Your Turn Is Next!');
    expect(res.body.data.recipientUserId).toBe(patientUser.id);
    expect(res.body.data.sentCount).toBeGreaterThan(0);
  });

  it('3. Patient unsubscribes Web Push device endpoint', async () => {
    const testEndpoint = `https://fcm.googleapis.com/fcm/send/unsub_${Date.now()}`;
    await prisma.pushSubscription.create({
      data: {
        userId: patientUser.id,
        endpoint: testEndpoint,
        p256dh: 'BNcRdreA...',
        auth: 'tBH...',
      },
    });

    const res = await request(app.getHttpServer())
      .delete('/api/push/unsubscribe')
      .send({ endpoint: testEndpoint })
      .expect(200);

    expect(res.body.success).toBe(true);

    const check = await prisma.pushSubscription.findUnique({
      where: { endpoint: testEndpoint },
    });
    expect(check).toBeNull();
  });
});
