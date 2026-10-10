import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';

describe('Reports & Analytics Export (E2E Integration)', () => {
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

    // Ensure Admin A user exists with CLINIC_ADMIN role
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

  it('1. Clinic Admin fetches daily clinic analytics report', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/clinics/${clinicA.id}/reports/daily`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.clinicId).toBe(clinicA.id);
    expect(res.body.data.clinicName).toBe('ABC Health Clinic');
    expect(typeof res.body.data.totalTokensIssued).toBe('number');
    expect(typeof res.body.data.totalAppointments).toBe('number');
    expect(typeof res.body.data.averageWaitMinutes).toBe('number');
  });

  it('2. Clinic Admin fetches monthly clinic analytics report', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/clinics/${clinicA.id}/reports/monthly`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.clinicId).toBe(clinicA.id);
    expect(res.body.data.month).toMatch(/^\d{4}-\d{2}$/);
    expect(typeof res.body.data.activeDoctorsCount).toBe('number');
  });

  it('3. Clinic Admin exports daily report to CSV format', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/clinics/${clinicA.id}/reports/export?format=csv&type=daily`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('Clinic,Date,Tokens Issued,Completed');
    expect(res.text).toContain('ABC Health Clinic');
  });

  it('4. Clinic Admin exports monthly report to CSV format', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/clinics/${clinicA.id}/reports/export?format=csv&type=monthly`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('Clinic,Month,Tokens Issued');
    expect(res.text).toContain('ABC Health Clinic');
  });

  it('5. Tenant isolation: Admin A cannot access reports for Clinic B', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/clinics/${clinicB.id}/reports/daily`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403);

    expect(res.body.success).toBe(false);
  });

  it('6. Patient role is denied access to clinic reports', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/clinics/${clinicA.id}/reports/daily`)
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(403);

    expect(res.body.success).toBe(false);
  });
});
