import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';

describe('Security Audit & Hardening Checklist (E2E Verification)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let clinicA: any;
  let clinicB: any;
  let patientToken: string;
  let receptionistToken: string;
  let superAdminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    prisma = app.get(PrismaService);

    const clinics = await prisma.clinic.findMany({ take: 2, orderBy: { createdAt: 'asc' } });
    clinicA = clinics[0];
    clinicB = clinics[1] || clinics[0];

    async function login(phoneNumber: string): Promise<string> {
      await prisma.oTPVerification.create({
        data: {
          phoneNumber,
          hashedOtp: '$2a$10$dummyHash',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
      });

      const res = await request(app.getHttpServer())
        .post('/api/auth/verify-otp')
        .send({ phoneNumber, otp: '123456' });

      return res.body.data.tokens.accessToken;
    }

    const recStaff = await prisma.clinicStaff.findFirst({
      where: { clinicId: clinicA.id, role: 'RECEPTIONIST' },
      include: { user: true },
    });
    const patientUser = await prisma.user.findFirst({
      where: { role: 'PATIENT' },
    });

    patientToken = await login(patientUser?.phoneNumber || '+919876510001');
    receptionistToken = await login(recStaff?.user?.phoneNumber || '+919876500012');
    superAdminToken = await login('+919999999999');
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('Checklist 1: Multi-Tenant Isolation Enforcement', () => {
    it('Blocks cross-tenant access when receptionist of Clinic A accesses Clinic B', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/clinics/${clinicB.id}/staff`)
        .set('Authorization', `Bearer ${receptionistToken}`)
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Cross-tenant access violation');
    });

    it('Allows super admin to bypass tenant scope for global operations', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/clinics')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Checklist 2: Zero PII on Public Endpoints', () => {
    it('Public QR Token endpoint strips names, phone numbers, and patient IDs', async () => {
      const token = await prisma.queueEntry.findFirst({
        where: { queue: { clinicId: clinicA.id } },
      });

      if (token) {
        const res = await request(app.getHttpServer())
          .get(`/api/queue/${token.publicToken}`)
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data.patientName).toBeUndefined();
        expect(res.body.data.patientPhone).toBeUndefined();
        expect(res.body.data.userId).toBeUndefined();
        expect(res.body.data.tokenNumber).toBeDefined();
      }
    });

    it('TV Viewer snapshot endpoint contains zero patient PII', async () => {
      const display = await prisma.displayDevice.findFirst({
        where: { clinicId: clinicA.id },
      });

      if (display) {
        const res = await request(app.getHttpServer())
          .get(`/api/viewer/${display.displayToken}/snapshot`)
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data.patientName).toBeUndefined();
        expect(res.body.data.phoneNumber).toBeUndefined();
      }
    });
  });

  describe('Checklist 3: Fail-Closed Security on External Integrations', () => {
    it('Rejects Razorpay webhook with missing signature header', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/webhooks/razorpay')
        .send({ event: 'payment.captured' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('Rejects WhatsApp webhook with forged X-Hub-Signature-256', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/webhooks/whatsapp')
        .set('x-hub-signature-256', 'sha256=invalid_forged_signature_123')
        .send({ object: 'whatsapp_business_account' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('Checklist 4: Input Validation & Whitelisting (forbidNonWhitelisted)', () => {
    it('Rejects unwhitelisted malicious fields in request payload with 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/send-otp')
        .send({
          phoneNumber: '+919876599999',
          maliciousInjectedField: 'DROP TABLE users;',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });
});
