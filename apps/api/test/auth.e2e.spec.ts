import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';

describe('Auth API (E2E Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    prisma = app.get(PrismaService);
    // Clear recent OTPs for test mobile to avoid 60s rate limit in tests
    await prisma.oTPVerification.deleteMany({
      where: { phoneNumber: '+919876543299' },
    });
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  const testMobile = '+919876543299';

  it('1. GET /health returns service status', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('2. POST /api/auth/send-otp sends OTP to valid mobile number', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/send-otp')
      .send({ phoneNumber: testMobile })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.expiresInSeconds).toBe(300);
  });

  it('3. POST /api/auth/verify-otp verifies OTP and returns JWT tokens', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/verify-otp')
      .send({
        phoneNumber: testMobile,
        otp: '123456', // Test mock accepted code
        name: 'Integration Test Patient',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user.phoneNumber).toBe(testMobile);
    expect(res.body.data.tokens.accessToken).toBeDefined();

    // Verify token with protected /api/auth/me
    const token = res.body.data.tokens.accessToken;
    const meRes = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(meRes.body.data.phoneNumber).toBe(testMobile);
  });

  it('4. POST /api/auth/verify-otp rejects invalid code', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/verify-otp')
      .send({
        phoneNumber: testMobile,
        otp: '000000',
      })
      .expect(401);
  });
});
