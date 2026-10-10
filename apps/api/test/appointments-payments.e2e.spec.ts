import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PaymentsService } from '../src/payments/payments.service';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';

describe('Appointments & Razorpay Payments (E2E Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let paymentsService: PaymentsService;

  let clinicA: any;
  let doctorA: any;
  let patientToken: string;
  let patientUserId: string;
  let receptionistToken: string;

  let testAppointmentId: string;
  let testPaymentOrderId: string;
  let testPaymentId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    prisma = app.get(PrismaService);
    paymentsService = app.get(PaymentsService);

    clinicA = await prisma.clinic.findUnique({ where: { slug: 'abc-health' } });
    doctorA = await prisma.doctor.findFirst({ where: { clinicId: clinicA.id } });

    // Clean existing test appointments and payments
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
    patientUserId = patRes.body.data.user.id;

    // Login Receptionist (+919876500001)
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
    receptionistToken = recRes.body.data.tokens.accessToken;
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  const slotTime1 = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const slotTime2 = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  it('1. Patient books an appointment (fail-closed slot availability)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        clinicId: clinicA.id,
        doctorId: doctorA.id,
        slotTime: slotTime1,
        bookingFee: 500,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('CONFIRMED');
    expect(res.body.data.bookingFee).toBe(500);
    expect(res.body.data.paymentStatus).toBe('PENDING');

    testAppointmentId = res.body.data.id;
  });

  it('2. Fail-Closed Check: Second booking for same doctor and same slot is rejected with 409 Conflict', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        clinicId: clinicA.id,
        doctorId: doctorA.id,
        slotTime: slotTime1,
        bookingFee: 500,
      })
      .expect(409);

    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('already booked');
  });

  it('3. Patient reschedules appointment to a free slot', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/appointments/${testAppointmentId}/reschedule`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ slotTime: slotTime2 })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.slotTime).toBe(slotTime2);
  });

  it('4. Patient creates Razorpay payment order for consultation fee', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        appointmentId: testAppointmentId,
        amount: 500,
        currency: 'INR',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.orderId).toBeDefined();
    expect(res.body.data.amount).toBe(500);
    expect(res.body.data.keyId).toBeDefined();

    testPaymentOrderId = res.body.data.orderId;
    testPaymentId = res.body.data.paymentId;
  });

  it('5. Patient verifies payment with valid HMAC-SHA256 signature', async () => {
    const fakeGatewayPaymentId = 'pay_test_abc123456';
    const validSignature = paymentsService.generateTestSignature(
      testPaymentOrderId,
      fakeGatewayPaymentId,
    );

    const res = await request(app.getHttpServer())
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        paymentId: testPaymentId,
        razorpayOrderId: testPaymentOrderId,
        razorpayPaymentId: fakeGatewayPaymentId,
        razorpaySignature: validSignature,
      })
      .expect(201);

    expect(res.body.success).toBe(true);

    // Verify appointment status updated to SUCCESS
    const apptRes = await request(app.getHttpServer())
      .get(`/api/appointments/${testAppointmentId}`)
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);

    expect(apptRes.body.data.paymentStatus).toBe('SUCCESS');
  });

  it('6. Server-side Razorpay Webhook with HMAC signature and duplicate idempotency', async () => {
    const webhookOrderId = `order_webhook_test_999`;
    // Create payment in DB for this webhook test
    const payment = await prisma.payment.create({
      data: {
        clinicId: clinicA.id,
        userId: patientUserId,
        appointmentId: testAppointmentId,
        amount: 500,
        currency: 'INR',
        status: 'CREATED',
        gatewayOrderId: webhookOrderId,
      },
    });

    const webhookEvent = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_webhook_event_777',
            order_id: webhookOrderId,
            amount: 50000,
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    };

    const payloadString = JSON.stringify(webhookEvent);
    const validWebhookSig = paymentsService.generateTestWebhookSignature(payloadString);

    // First Webhook Call
    const res1 = await request(app.getHttpServer())
      .post('/api/webhooks/razorpay')
      .set('x-razorpay-signature', validWebhookSig)
      .set('Content-Type', 'application/json')
      .send(payloadString)
      .expect(200);

    expect(res1.body.success).toBe(true);
    expect(res1.body.data.processed).toBe(true);

    // Duplicate Webhook Call (Idempotent delivery)
    const res2 = await request(app.getHttpServer())
      .post('/api/webhooks/razorpay')
      .set('x-razorpay-signature', validWebhookSig)
      .set('Content-Type', 'application/json')
      .send(payloadString)
      .expect(200);

    expect(res2.body.success).toBe(true);
    expect(res2.body.data.duplicate).toBe(true);
  });

  it('7. Clinic Receptionist confirms arrival, converting appointment into active queue token', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/clinics/${clinicA.id}/appointments/${testAppointmentId}/confirm-arrival`)
      .set('Authorization', `Bearer ${receptionistToken}`)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.queueEntryId).toBeDefined();
    expect(res.body.data.tokenNumber).toMatch(/^A-\d{2}$/);
  });
});
