import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';

describe('Phase 3 — AI Clinic Insights & Dynamic Ad Targeting (E2E Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let clinicA: any;
  let clinicB: any;
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

    clinicA = await prisma.clinic.findUnique({ where: { slug: 'abc-health' } });
    clinicB = await prisma.clinic.findUnique({ where: { slug: 'city-dental' } });

    // Clinic Admin Login
    const adminUser = await prisma.user.upsert({
      where: { phoneNumber: '+919876500000' },
      update: { role: 'CLINIC_ADMIN' },
      create: {
        phoneNumber: '+919876500000',
        name: 'Dr. Admin A',
        role: 'CLINIC_ADMIN',
      },
    });

    await prisma.clinicStaff.upsert({
      where: { clinicId_userId: { clinicId: clinicA.id, userId: adminUser.id } },
      update: { role: 'CLINIC_ADMIN' },
      create: {
        clinicId: clinicA.id,
        userId: adminUser.id,
        role: 'CLINIC_ADMIN',
      },
    });

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

    // Patient login
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
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('1. Clinic Admin retrieves automated AI clinic insights & bottleneck detection', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/clinics/${clinicA.id}/reports/insights`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    const data = res.body.data;
    expect(data.clinicId).toBe(clinicA.id);
    expect(data.clinicName).toBe('ABC Health Clinic');
    expect(typeof data.summary).toBe('string');
    expect(Array.isArray(data.bottlenecksDetected)).toBe(true);
    expect(Array.isArray(data.recommendedActions)).toBe(true);
    expect(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']).toContain(data.predictedTomorrowLoad);
    expect(typeof data.estimatedPeakWindow).toBe('string');
  });

  it('2. Tenant isolation: Admin cannot access AI insights of another clinic', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/clinics/${clinicB.id}/reports/insights`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403);

    expect(res.body.success).toBe(false);
  });

  it('3. Dynamic Advertisement Targeting: Clinic-specific ad takes priority over generic ad', async () => {
    // Create generic network-wide ad
    await prisma.advertisement.create({
      data: {
        title: 'Generic Health Insurance',
        imageUrl: 'https://images.unsplash.com/generic-ad.png',
        placement: 'TV_VIEWER_BOTTOM',
        clinicId: null,
      },
    });

    // Create clinic-specific targeted ad for Clinic A
    const targetedAd = await prisma.advertisement.create({
      data: {
        title: 'ABC Health Pharmacy 20% Off',
        imageUrl: 'https://images.unsplash.com/abc-pharmacy.png',
        placement: 'TV_VIEWER_BOTTOM',
        clinicId: clinicA.id,
      },
    });

    // Request ad with clinicId specified
    const res = await request(app.getHttpServer())
      .get(`/api/ads/TV_VIEWER_BOTTOM?clinicId=${clinicA.id}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(targetedAd.id);
    expect(res.body.data.title).toBe('ABC Health Pharmacy 20% Off');
  });
});

