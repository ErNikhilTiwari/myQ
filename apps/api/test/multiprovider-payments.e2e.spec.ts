import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';

describe('Phase 2 — Multi-Provider Payment Gateway (E2E Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let clinicA: any;
  let doctorA: any;
  let patientToken: string;
  let testAppointmentId: string;

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
    doctorA = await prisma.doctor.findFirst({ where: { clinicId: clinicA.id } });

    // Clean test appointments and payments
    await prisma.payment.deleteMany({ where: { clinicId: clinicA.id } });
    await prisma.appointment.deleteMany({ where: { clinicId: clinicA.id } });

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

    // Book test appointment
    const apptRes = await request(app.getHttpServer())
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        clinicId: clinicA.id,
        doctorId: doctorA.id,
        slotTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        bookingFee: 650,
      });

    testAppointmentId = apptRes.body.data.id;
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('1. Create payment order with RAZORPAY provider (Default)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        appointmentId: testAppointmentId,
        amount: 650,
        provider: 'RAZORPAY',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.provider).toBe('RAZORPAY');
    expect(res.body.data.orderId).toContain('razorpay_order_');
    expect(res.body.data.amount).toBe(650);
  });

  it('2. Create payment order with CASHFREE provider abstraction', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        appointmentId: testAppointmentId,
        amount: 650,
        provider: 'CASHFREE',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.provider).toBe('CASHFREE');
    expect(res.body.data.orderId).toContain('cashfree_order_');
    expect(res.body.data.keyId).toBe('cashfree_key_test');
  });

  it('3. Create payment order with PHONEPE UPI provider abstraction', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        appointmentId: testAppointmentId,
        amount: 650,
        provider: 'PHONEPE',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.provider).toBe('PHONEPE');
    expect(res.body.data.orderId).toContain('phonepe_order_');
    expect(res.body.data.keyId).toBe('phonepe_key_test');
  });
});
