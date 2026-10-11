import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { WhatsAppService } from '../src/whatsapp/whatsapp.service';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';

describe('Phase 2 — WhatsApp Full Chatbot & Multi-Turn Conversation (E2E Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let whatsAppService: WhatsAppService;

  let clinicA: any;
  const patientPhone = '+919876599111';

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

    // Clean test conversation sessions and messages for this phone
    await prisma.whatsAppConversation.deleteMany({ where: { phoneNumber: patientPhone } });
    await prisma.whatsAppMessage.deleteMany({ where: { phoneNumber: patientPhone } });
    await prisma.appointment.deleteMany({ where: { user: { phoneNumber: patientPhone } } });
    await prisma.user.deleteMany({ where: { phoneNumber: patientPhone } });
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('1. Turn 1: Patient says "Hi" -> Chatbot replies with Main Menu', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/clinics/${clinicA.id}/whatsapp/simulate-chat`)
      .send({
        phoneNumber: patientPhone,
        messageText: 'Hi',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.replyText).toContain('Welcome to QueueApp');
    expect(res.body.data.replyText).toContain('1️⃣  *My Queue Status*');
    expect(res.body.data.replyText).toContain('2️⃣  *Book Appointment*');
    expect(res.body.data.nextState).toBe('IDLE');
  });

  it('2. Turn 2: Patient registers name -> Bot transitions to REGISTER_NAME and saves user profile', async () => {
    // Patient chooses 5 (Register)
    const res1 = await request(app.getHttpServer())
      .post(`/api/clinics/${clinicA.id}/whatsapp/simulate-chat`)
      .send({
        phoneNumber: patientPhone,
        messageText: '5',
      })
      .expect(200);

    expect(res1.body.data.nextState).toBe('REGISTER_NAME');
    expect(res1.body.data.replyText).toContain('Please reply with your full name');

    // Patient sends their name
    const res2 = await request(app.getHttpServer())
      .post(`/api/clinics/${clinicA.id}/whatsapp/simulate-chat`)
      .send({
        phoneNumber: patientPhone,
        messageText: 'Vikramaditya Roy',
      })
      .expect(200);

    expect(res2.body.data.nextState).toBe('IDLE');
    expect(res2.body.data.replyText).toContain('Registration Successful');
    expect(res2.body.data.replyText).toContain('Vikramaditya Roy');

    // Check user was created in DB
    const user = await prisma.user.findUnique({ where: { phoneNumber: patientPhone } });
    expect(user).toBeDefined();
    expect(user?.name).toBe('Vikramaditya Roy');
  });

  it('3. Turn 3: Multi-turn Appointment Booking flow (Doctor -> Slot -> Confirmation)', async () => {
    // Step A: Patient types '2' (Book Appointment)
    const resA = await request(app.getHttpServer())
      .post(`/api/clinics/${clinicA.id}/whatsapp/simulate-chat`)
      .send({
        phoneNumber: patientPhone,
        messageText: '2',
      })
      .expect(200);

    expect(resA.body.data.nextState).toBe('SELECT_DOCTOR');
    expect(resA.body.data.replyText).toContain('Select a Doctor');

    // Step B: Patient picks Doctor '1'
    const resB = await request(app.getHttpServer())
      .post(`/api/clinics/${clinicA.id}/whatsapp/simulate-chat`)
      .send({
        phoneNumber: patientPhone,
        messageText: '1',
      })
      .expect(200);

    expect(resB.body.data.nextState).toBe('SELECT_SLOT');
    expect(resB.body.data.replyText).toContain('Available Slots');

    // Step C: Patient selects Slot '2'
    const resC = await request(app.getHttpServer())
      .post(`/api/clinics/${clinicA.id}/whatsapp/simulate-chat`)
      .send({
        phoneNumber: patientPhone,
        messageText: '2',
      })
      .expect(200);

    expect(resC.body.data.nextState).toBe('CONFIRM_BOOKING');
    expect(resC.body.data.replyText).toContain('Confirm Booking Details');

    // Step D: Patient confirms with '1'
    const resD = await request(app.getHttpServer())
      .post(`/api/clinics/${clinicA.id}/whatsapp/simulate-chat`)
      .send({
        phoneNumber: patientPhone,
        messageText: '1',
      })
      .expect(200);

    expect(resD.body.data.nextState).toBe('IDLE');
    expect(resD.body.data.replyText).toContain('Appointment Confirmed!');

    // Verify appointment was created in DB
    const appt = await prisma.appointment.findFirst({
      where: { user: { phoneNumber: patientPhone } },
    });
    expect(appt).toBeDefined();
    expect(appt?.status).toBe('CONFIRMED');
  });

  it('4. Turn 4: Global navigation commands ("help" and "cancel")', async () => {
    // Type help
    const helpRes = await request(app.getHttpServer())
      .post(`/api/clinics/${clinicA.id}/whatsapp/simulate-chat`)
      .send({
        phoneNumber: patientPhone,
        messageText: 'help',
      })
      .expect(200);

    expect(helpRes.body.data.replyText).toContain('QueueApp Help & Commands');

    // Type cancel
    const cancelRes = await request(app.getHttpServer())
      .post(`/api/clinics/${clinicA.id}/whatsapp/simulate-chat`)
      .send({
        phoneNumber: patientPhone,
        messageText: 'cancel',
      })
      .expect(200);

    expect(cancelRes.body.data.nextState).toBe('IDLE');
    expect(cancelRes.body.data.replyText).toContain('Welcome to QueueApp');
  });

  it('5. Webhook Integration: Meta Inbound Webhook automatically replies with state machine message', async () => {
    const wamid = `wamid_sim_turn_${Date.now()}`;
    const payload = {
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
                    from: patientPhone.replace('+', ''),
                    id: wamid,
                    timestamp: `${Math.floor(Date.now() / 1000)}`,
                    text: {
                      body: '3', // My Appointments
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

    const payloadString = JSON.stringify(payload);
    const validSig = whatsAppService.generateTestHubSignature(payloadString);

    const res = await request(app.getHttpServer())
      .post('/api/webhooks/whatsapp')
      .set('x-hub-signature-256', validSig)
      .set('Content-Type', 'application/json')
      .send(payloadString)
      .expect(200);

    expect(res.body.success).toBe(true);

    // Verify inbound message logged
    const inboundMsg = await prisma.whatsAppMessage.findFirst({
      where: { gatewayMessageId: wamid },
    });
    expect(inboundMsg).toBeDefined();
    expect(inboundMsg?.direction).toBe('INBOUND');

    // Verify automated bot reply logged
    const outboundReply = await prisma.whatsAppMessage.findFirst({
      where: { phoneNumber: patientPhone, direction: 'OUTBOUND' },
      orderBy: { createdAt: 'desc' },
    });
    expect(outboundReply).toBeDefined();
    expect(outboundReply?.content).toContain('Your Upcoming Appointments');
  });
});
