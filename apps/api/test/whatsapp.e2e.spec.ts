import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { WhatsAppService } from '../src/whatsapp/whatsapp.service';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';

describe('WhatsApp Cloud API Integration (E2E Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let whatsAppService: WhatsAppService;

  let clinicA: any;
  let clinicB: any;
  let receptionistToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    prisma = app.get(PrismaService);
    whatsAppService = app.get(WhatsAppService);

    clinicA = await prisma.clinic.findUnique({ where: { slug: 'abc-health' } });
    clinicB = await prisma.clinic.findUnique({ where: { slug: 'city-dental' } });

    // Clean test messages
    await prisma.whatsAppMessage.deleteMany({ where: { clinicId: clinicA.id } });

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

  it('1. Webhook Verification Challenge: GET /api/webhooks/whatsapp returns challenge string', async () => {
    const challengeVal = 'my_challenge_random_12345';
    const res = await request(app.getHttpServer())
      .get(
        `/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=queueapp_verify_token_secret&hub.challenge=${challengeVal}`,
      )
      .expect(200);

    expect(res.text).toBe(challengeVal);
  });

  it('2. Staff sends Outbound WhatsApp Template (appointment_confirmed)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/clinics/${clinicA.id}/whatsapp/send-template`)
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        recipientPhone: '+919876543210',
        templateName: 'appointment_confirmed',
        parameters: {
          slotTime: '2026-10-15 10:30 AM',
        },
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.direction).toBe('OUTBOUND');
    expect(res.body.data.status).toBe('SENT');
    expect(res.body.data.content).toContain('appointment_confirmed');
    expect(res.body.data.content).toContain('2026-10-15 10:30 AM');
  });

  it('3. Inbound Meta Webhook updates message status to DELIVERED with HMAC validation and idempotency', async () => {
    const testGatewayId = 'wam_test_gateway_999';
    // Create outbound message awaiting status
    await prisma.whatsAppMessage.create({
      data: {
        clinicId: clinicA.id,
        phoneNumber: '+919876543210',
        direction: 'OUTBOUND',
        messageType: 'TEMPLATE',
        content: 'Test notification',
        gatewayMessageId: testGatewayId,
        status: 'SENT',
      },
    });

    const webhookPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '15550268593',
                  phone_number_id: '109989825409873',
                },
                statuses: [
                  {
                    id: testGatewayId,
                    status: 'delivered',
                    timestamp: '1697000000',
                    recipient_id: '919876543210',
                  },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    };

    const payloadString = JSON.stringify(webhookPayload);
    const validSignature = whatsAppService.generateTestHubSignature(payloadString);

    // Call 1: Status updated to DELIVERED
    const res1 = await request(app.getHttpServer())
      .post('/api/webhooks/whatsapp')
      .set('x-hub-signature-256', validSignature)
      .set('Content-Type', 'application/json')
      .send(payloadString)
      .expect(200);

    expect(res1.body.success).toBe(true);
    expect(res1.body.data.processed).toBe(true);

    const updated = await prisma.whatsAppMessage.findFirst({
      where: { gatewayMessageId: testGatewayId },
    });
    expect(updated?.status).toBe('DELIVERED');

    // Call 2: Duplicate delivery is safely recognized as duplicate (Idempotent)
    const res2 = await request(app.getHttpServer())
      .post('/api/webhooks/whatsapp')
      .set('x-hub-signature-256', validSignature)
      .set('Content-Type', 'application/json')
      .send(payloadString)
      .expect(200);

    expect(res2.body.success).toBe(true);
    expect(res2.body.data.duplicate).toBe(true);
  });

  it('4. Inbound Meta Webhook receives incoming patient message and records it', async () => {
    const inboundPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '15550268593',
                  phone_number_id: '109989825409873',
                },
                messages: [
                  {
                    from: '919876543210',
                    id: 'wamid_inbound_patient_msg_101',
                    timestamp: '1697000100',
                    text: {
                      body: 'What is my current queue status?',
                    },
                    type: 'text',
                  },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    };

    const payloadString = JSON.stringify(inboundPayload);
    const validSignature = whatsAppService.generateTestHubSignature(payloadString);

    const res = await request(app.getHttpServer())
      .post('/api/webhooks/whatsapp')
      .set('x-hub-signature-256', validSignature)
      .set('Content-Type', 'application/json')
      .send(payloadString)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.processed).toBe(true);

    // Verify stored inbound message
    const msg = await prisma.whatsAppMessage.findFirst({
      where: { gatewayMessageId: 'wamid_inbound_patient_msg_101' },
    });
    expect(msg).toBeDefined();
    expect(msg?.direction).toBe('INBOUND');
    expect(msg?.content).toBe('What is my current queue status?');
  });

  it('5. Tenant isolation: Receptionist A cannot send messages using Clinic B', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/clinics/${clinicB.id}/whatsapp/send-message`)
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        recipientPhone: '+919876543210',
        messageText: 'Unauthorized attempt',
      })
      .expect(403);

    expect(res.body.success).toBe(false);
  });
});
