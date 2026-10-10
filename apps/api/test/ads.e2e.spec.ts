import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';

describe('Advertisement Slots & Impression/Click Tracking (E2E Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let superAdminToken: string;
  let patientToken: string;
  let createdAdId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    prisma = app.get(PrismaService);

    // Clean test ads
    await prisma.adClick.deleteMany({});
    await prisma.adImpression.deleteMany({});
    await prisma.advertisement.deleteMany({});

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

  it('1. Super Admin creates an ad campaign for TV_VIEWER_BOTTOM', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/super/ads')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        title: 'Health Insurance Promotion 2026',
        imageUrl: 'https://cdn.example.com/ads/health_insurance_banner.png',
        targetUrl: 'https://example.com/insurance-quote',
        placement: 'TV_VIEWER_BOTTOM',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Health Insurance Promotion 2026');
    expect(res.body.data.placement).toBe('TV_VIEWER_BOTTOM');
    expect(res.body.data.isActive).toBe(true);

    createdAdId = res.body.data.id;
  });

  it('2. Patient/Public viewer retrieves active ad for TV_VIEWER_BOTTOM without authentication', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/ads/TV_VIEWER_BOTTOM')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(createdAdId);
    expect(res.body.data.imageUrl).toContain('health_insurance_banner.png');
  });

  it('3. TV display records an ad impression beacon', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/ads/${createdAdId}/impression`)
      .send({
        deviceType: 'TV',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.recorded).toBe(true);
  });

  it('4. User clicks ad and records click beacon returning targetUrl', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/ads/${createdAdId}/click`)
      .send({
        deviceType: 'MOBILE',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.targetUrl).toBe('https://example.com/insurance-quote');
  });

  it('5. Super Admin lists ads with impression and click analytics metrics', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/super/ads')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    const ad = res.body.data.find((a: any) => a.id === createdAdId);
    expect(ad).toBeDefined();
    expect(ad.impressionsCount).toBe(1);
    expect(ad.clicksCount).toBe(1);
  });

  it('6. Non-super admin cannot create advertisement campaigns', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/super/ads')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        title: 'Hacked Ad',
        imageUrl: 'https://evil.com/ad.png',
        placement: 'TV_VIEWER_BOTTOM',
      })
      .expect(403);

    expect(res.body.success).toBe(false);
  });
});
