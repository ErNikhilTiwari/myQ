import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';

describe('Advanced Analytics & Hourly Distribution (E2E Integration)', () => {
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

    // Ensure Admin user
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

    // Login Clinic Admin A
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
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('1. Clinic Admin retrieves hourly traffic distribution and performance metrics', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/clinics/${clinicA.id}/reports/advanced-analytics`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    const data = res.body.data;
    expect(data.clinicId).toBe(clinicA.id);
    expect(data.clinicName).toBe('ABC Health Clinic');
    expect(data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Array.isArray(data.hourlyTraffic)).toBe(true);
    expect(data.hourlyTraffic.length).toBe(13); // 08:00 to 20:00

    // Validate hourly traffic structure
    const firstHour = data.hourlyTraffic[0];
    expect(firstHour).toHaveProperty('hour');
    expect(firstHour).toHaveProperty('tokensCount');

    // Peak hour and rates
    expect(typeof data.peakHour).toBe('number');
    expect(typeof data.longestWaitMinutes).toBe('number');
    expect(typeof data.completionRatePercent).toBe('number');
    expect(typeof data.noShowRatePercent).toBe('number');
  });


  it('2. Tenant isolation: Admin cannot fetch advanced analytics for unauthorized clinic', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/clinics/${clinicB.id}/reports/advanced-analytics`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403);

    expect(res.body.success).toBe(false);
  });

  it('3. Patient cannot access advanced analytics', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/clinics/${clinicA.id}/reports/advanced-analytics`)
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(403);

    expect(res.body.success).toBe(false);
  });
});
