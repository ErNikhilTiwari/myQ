import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';

describe('Phase 3 — Multi-Location Hospital Chains (E2E Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let superAdminToken: string;
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

    // Super Admin login
    const superAdmin = await prisma.user.upsert({
      where: { phoneNumber: '+919999900000' },
      update: { role: 'SUPER_ADMIN' },
      create: {
        phoneNumber: '+919999900000',
        name: 'Super Director',
        role: 'SUPER_ADMIN',
      },
    });

    await prisma.oTPVerification.create({
      data: {
        phoneNumber: '+919999900000',
        hashedOtp: '$2a$10$dummyHash',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    const superRes = await request(app.getHttpServer())
      .post('/api/auth/verify-otp')
      .send({ phoneNumber: '+919999900000', otp: '123456' });
    superAdminToken = superRes.body.data.tokens.accessToken;

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

  it('1. Super Admin creates a multi-location Hospital Chain network', async () => {
    const chainCode = `APOLLO_${Date.now()}`;
    const res = await request(app.getHttpServer())
      .post('/api/super/hospital-chains')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'Apollo Health City Network',
        code: chainCode,
        headquarters: 'Hyderabad, India',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.code).toBe(chainCode);
    expect(res.body.data.name).toBe('Apollo Health City Network');
    expect(res.body.data.headquarters).toBe('Hyderabad, India');
  });

  it('2. Provisions multiple clinic branches linked to a parent Hospital Chain', async () => {
    const chainCode = `MAX_${Date.now()}`;
    const chain = await prisma.hospitalChain.create({
      data: {
        name: 'Max Healthcare Network',
        code: chainCode,
        headquarters: 'New Delhi, India',
      },
    });

    const clinic1Slug = `max-saket-${Date.now()}`;
    const clinic2Slug = `max-gurugram-${Date.now()}`;

    // Provision Branch 1
    const res1 = await request(app.getHttpServer())
      .post('/api/super/clinics')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        chainId: chain.id,
        name: 'Max Super Speciality Hospital Saket',
        slug: clinic1Slug,
        phoneNumber: '+911126515050',
        city: 'New Delhi',
        address: 'Saket, New Delhi',
      })
      .expect(201);

    expect(res1.body.success).toBe(true);
    expect(res1.body.data.chainId).toBe(chain.id);

    // Provision Branch 2
    const res2 = await request(app.getHttpServer())
      .post('/api/super/clinics')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        chainId: chain.id,
        name: 'Max Hospital Gurugram',
        slug: clinic2Slug,
        phoneNumber: '+911246623000',
        city: 'Gurugram',
        address: 'Sushant Lok 1, Gurugram',
      })
      .expect(201);

    expect(res2.body.success).toBe(true);
    expect(res2.body.data.chainId).toBe(chain.id);

    // Query Chain details
    const chainRes = await request(app.getHttpServer())
      .get(`/api/hospital-chains/${chain.id}`)
      .expect(200);

    expect(chainRes.body.success).toBe(true);
    expect(chainRes.body.data.name).toBe('Max Healthcare Network');
    expect(chainRes.body.data.clinics.length).toBe(2);
  });

  it('3. Public API discovers all hospital chains and branches', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/hospital-chains')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('4. Role security: Regular patient cannot provision hospital chains', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/super/hospital-chains')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        name: 'Malicious Chain',
        code: 'HACK',
      })
      .expect(403);

    expect(res.body.success).toBe(false);
  });
});
