import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { SubscriptionsService } from '../src/subscriptions/subscriptions.service';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';

describe('Phase 2 — Multi-Clinic SaaS Subscriptions & Tier Limits (E2E Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let subscriptionsService: SubscriptionsService;

  let clinicA: any;
  let adminToken: string;
  let superAdminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    prisma = app.get(PrismaService);
    subscriptionsService = app.get(SubscriptionsService);

    clinicA = await prisma.clinic.findUnique({ where: { slug: 'abc-health' } });

    // Clean existing test subscriptions
    await prisma.subscription.deleteMany({ where: { clinicId: clinicA.id } });

    // Login Clinic Admin A (+919876500000)
    await prisma.oTPVerification.create({
      data: {
        phoneNumber: '+919876500000',
        hashedOtp: '$2a$10$dummyHash',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    const adminRes = await request(app.getHttpServer())
      .post('/api/auth/verify-otp')
      .send({ phoneNumber: '+919876500000', otp: '123456' });
    adminToken = adminRes.body.data.tokens.accessToken;

    // Login Super Admin (+919999999999)
    await prisma.oTPVerification.create({
      data: {
        phoneNumber: '+919999999999',
        hashedOtp: '$2a$10$dummyHash',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    const superRes = await request(app.getHttpServer())
      .post('/api/auth/verify-otp')
      .send({ phoneNumber: '+919999999999', otp: '123456' });
    superAdminToken = superRes.body.data.tokens.accessToken;
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('1. Clinic starts on default FREE tier with baseline limits', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/clinics/${clinicA.id}/subscription`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.plan).toBe('FREE');
    expect(res.body.data.maxDoctors).toBe(1);
    expect(res.body.data.hasAds).toBe(true);
  });

  it('2. Quota Enforcement: Exceeding Free plan doctor limits throws 400 Bad Request', async () => {
    // Attempting to add doctors beyond limit of 1
    await expect(
      subscriptionsService.enforceDoctorLimit(clinicA.id),
    ).rejects.toThrow('Subscription plan limit reached');
  });

  it('3. Clinic Admin upgrades subscription to ENTERPRISE plan (Unlimited doctors, Ad-free)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/clinics/${clinicA.id}/subscription/upgrade`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        plan: 'ENTERPRISE',
        durationMonths: 12,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.plan || res.body.data.plan).toBe('ENTERPRISE');
    expect(res.body.data.maxDoctors).toBe(100);
    expect(res.body.data.hasAds).toBe(false);
    expect(res.body.data.endDate).toBeDefined();

    // Now doctor enforcement passes without error
    await expect(
      subscriptionsService.enforceDoctorLimit(clinicA.id),
    ).resolves.not.toThrow();
  });

  it('4. Super Admin lists all clinic subscriptions across platform', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/super/subscriptions')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    const sub = res.body.data.find((s: any) => s.clinicId === clinicA.id);
    expect(sub).toBeDefined();
    expect(sub.plan).toBe('ENTERPRISE');
  });

});
