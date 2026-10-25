import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';

describe('Multi-Tenant Isolation & RBAC (E2E Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let clinicA: any;
  let clinicB: any;
  let receptionistAToken: string;
  let receptionistBToken: string;
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

    // Fetch seeded clinics
    const clinics = await prisma.clinic.findMany({ take: 2, orderBy: { createdAt: 'asc' } });
    clinicA = clinics[0];
    clinicB = clinics[1] || clinics[0];

    async function loginUser(phoneNumber: string): Promise<string> {
      await prisma.oTPVerification.create({
        data: {
          phoneNumber,
          hashedOtp: '$2a$10$dummyHashValue',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
      });

      const res = await request(app.getHttpServer())
        .post('/api/auth/verify-otp')
        .send({ phoneNumber, otp: '123456' });

      return res.body.data.tokens.accessToken;
    }

    // Login Receptionist A from seeded clinic staff
    const recAStaff = await prisma.clinicStaff.findFirst({
      where: { clinicId: clinicA.id, role: 'RECEPTIONIST' },
      include: { user: true },
    });
    receptionistAToken = await loginUser(recAStaff?.user?.phoneNumber || '+919876500012');

    // Create & Login Receptionist B for Clinic B
    const recBUser = await prisma.user.upsert({
      where: { phoneNumber: '+919876500099' },
      update: {},
      create: {
        phoneNumber: '+919876500099',
        name: 'Anita Desai (Receptionist B)',
        role: 'RECEPTIONIST',
      },
    });

    await prisma.clinicStaff.upsert({
      where: { clinicId_userId: { clinicId: clinicB.id, userId: recBUser.id } },
      update: {},
      create: { clinicId: clinicB.id, userId: recBUser.id, role: 'RECEPTIONIST' },
    });

    receptionistBToken = await loginUser('+919876500099');

    // Login Super Admin (+919999999999)
    superAdminToken = await loginUser('+919999999999');

    // Login Standard Patient (+919876511111)
    patientToken = await loginUser('+919876511111');
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('1. Public Discovery', () => {
    it('allows anyone to list active clinics', async () => {
      const res = await request(app.getHttpServer()).get('/api/clinics').expect(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('allows anyone to view doctors in a clinic', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/clinics/${clinicA.id}/doctors`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('2. Cross-Tenant Protection (Receptionist A vs Clinic B)', () => {
    it('allows Receptionist A to create doctor in Clinic A', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/clinics/${clinicA.id}/doctors`)
        .set('Authorization', `Bearer ${receptionistAToken}`)
        .send({
          name: 'Dr. Vikram Patel',
          specialization: 'Cardiologist',
          roomNumber: 'Room 105',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.clinicId).toBe(clinicA.id);
    });

    it('FORBIDS Receptionist A from creating doctor in Clinic B (403 Forbidden)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/clinics/${clinicB.id}/doctors`)
        .set('Authorization', `Bearer ${receptionistAToken}`)
        .send({
          name: 'Attacker Doctor',
          specialization: 'Malicious',
        })
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Cross-tenant access violation');
    });

    it('FORBIDS Receptionist A from reading private staff list of Clinic B (403 Forbidden)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/clinics/${clinicB.id}/staff`)
        .set('Authorization', `Bearer ${receptionistAToken}`)
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Cross-tenant access violation');
    });

    it('allows Receptionist A to read private staff list of Clinic A', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/clinics/${clinicA.id}/staff`)
        .set('Authorization', `Bearer ${receptionistAToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('REJECTS modifying a Clinic B doctor through Clinic A endpoint (404 Not Found)', async () => {
      // Find a doctor belonging to Clinic B
      const doctorB = await prisma.doctor.findFirst({ where: { clinicId: clinicB.id } });
      expect(doctorB).toBeDefined();

      // Receptionist A attempts to mutate Doctor B by calling Clinic A endpoint with doctorB.id
      const res = await request(app.getHttpServer())
        .patch(`/api/clinics/${clinicA.id}/doctors/${doctorB!.id}`)
        .set('Authorization', `Bearer ${receptionistAToken}`)
        .send({ name: 'Hacked Doctor Name' })
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('not found in clinic');
    });
  });

  describe('3. Role-Based Access Control (RBAC)', () => {
    it('FORBIDS a Patient from creating doctors (403 Forbidden)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/clinics/${clinicA.id}/doctors`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ name: 'Unauthorized Doctor', specialization: 'None' })
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    it('allows Super Admin to create a new clinic globally', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/super/clinics')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Green Valley Clinic',
          slug: `green-valley-${Date.now()}`,
          phoneNumber: '+919876543300',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Green Valley Clinic');
    });

    it('FORBIDS a Receptionist from calling Super Admin endpoint (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post('/api/super/clinics')
        .set('Authorization', `Bearer ${receptionistAToken}`)
        .send({
          name: 'Unauthorized Clinic',
          slug: 'unauthorized-slug',
          phoneNumber: '+919999999000',
        })
        .expect(403);
    });
  });
});
