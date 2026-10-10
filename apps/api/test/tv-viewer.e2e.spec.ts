import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';

describe('TV Viewer & Display Architecture (E2E Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let clinicA: any;
  let clinicB: any;
  let receptionistAToken: string;
  let superAdminToken: string;
  let displayDevice: any;

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

    // Clean display devices for test clinic
    await prisma.displayDevice.deleteMany({ where: { clinicId: clinicA.id } });

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

    // Login Super Admin (+919999999999)
    await prisma.oTPVerification.create({
      data: {
        phoneNumber: '+919999999999',
        hashedOtp: '$2a$10$dummyHash',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    const adminRes = await request(app.getHttpServer())
      .post('/api/auth/verify-otp')
      .send({ phoneNumber: '+919999999999', otp: '123456' });
    superAdminToken = adminRes.body.data.tokens.accessToken;
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('1. Admin registers new TV display device with displayToken', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/clinics/${clinicA.id}/displays`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'Main Lobby Smart TV 55"',
        template: 'NOW_SERVING_NEXT',
        soundEnabled: true,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Main Lobby Smart TV 55"');
    expect(res.body.data.displayToken).toMatch(/^dt_/);
    expect(res.body.data.template).toBe('NOW_SERVING_NEXT');

    displayDevice = res.body.data;
  });

  it('2. TV polls snapshot via displayToken with ZERO authentication', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/viewer/${displayDevice.displayToken}/snapshot`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.clinicName).toBe(clinicA.name);
    expect(res.body.data.template).toBe('NOW_SERVING_NEXT');
    expect(res.body.data.soundEnabled).toBe(true);
    expect(Array.isArray(res.body.data.recentCalled)).toBe(true);
    expect(Array.isArray(res.body.data.nextWaiting)).toBe(true);
  });

  it('3. TV sends periodic heartbeat without authentication and reports online', async () => {
    const pingRes = await request(app.getHttpServer())
      .post(`/api/viewer/${displayDevice.displayToken}/heartbeat`)
      .expect(200);

    expect(pingRes.body.success).toBe(true);
    expect(pingRes.body.data.status).toBe('heartbeat_acknowledged');

    // Admin lists displays and sees device is ONLINE
    const listRes = await request(app.getHttpServer())
      .get(`/api/clinics/${clinicA.id}/displays`)
      .set('Authorization', `Bearer ${receptionistAToken}`)
      .expect(200);

    const deviceInList = listRes.body.data.find((d: any) => d.id === displayDevice.id);
    expect(deviceInList).toBeDefined();
    expect(deviceInList.isOnline).toBe(true);
  });

  it('4. Rejects invalid displayToken with 404 error envelope', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/viewer/dt_invalid_fake_token_999/snapshot')
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('not found');
  });

  it('5. Enforces tenant isolation: Receptionist A cannot access Clinic B displays', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/clinics/${clinicB.id}/displays`)
      .set('Authorization', `Bearer ${receptionistAToken}`)
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Cross-tenant access violation');
  });
});
