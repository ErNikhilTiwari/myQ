import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { WhatsAppService } from '../src/whatsapp/whatsapp.service';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';

describe('Phase 3 — AI NLU Intent Router & Clinic FAQ RAG (E2E Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let whatsAppService: WhatsAppService;

  let clinicA: any;
  const patientPhone = '+919876543210';

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
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('1. AI Intent Classifier accurately routes natural language questions into structured intents', () => {
    const r1 = whatsAppService.classifyIntent('What are your opening hours on Saturday?');
    expect(r1.intent).toBe('FAQ');
    expect(r1.confidence).toBeGreaterThan(0.9);

    const r2 = whatsAppService.classifyIntent('Where is the clinic located?');
    expect(r2.intent).toBe('FAQ');

    const r3 = whatsAppService.classifyIntent('Can I check my current queue status?');
    expect(r3.intent).toBe('CHECK_QUEUE');

    const r4 = whatsAppService.classifyIntent('I want to book an appointment with doctor');
    expect(r4.intent).toBe('BOOK_APPOINTMENT');

    const r5 = whatsAppService.classifyIntent('Cancel my current action');
    expect(r5.intent).toBe('CANCEL');
  });

  it('2. Scoped Clinic Knowledge Retrieval (RAG) answers clinic timing questions correctly', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/clinics/${clinicA.id}/whatsapp/simulate-chat`)
      .send({
        phoneNumber: patientPhone,
        messageText: 'What are your clinic timings?',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.replyText).toContain('ABC Health Clinic Timings');
    expect(res.body.data.replyText).toContain('08:00 AM – 08:00 PM');
    expect(res.body.data.nextState).toBe('IDLE');
  });

  it('3. Scoped Clinic Knowledge Retrieval (RAG) answers location and fee inquiries', async () => {
    // Location inquiry
    const locRes = await request(app.getHttpServer())
      .post(`/api/clinics/${clinicA.id}/whatsapp/simulate-chat`)
      .send({
        phoneNumber: patientPhone,
        messageText: 'Where is the clinic address?',
      })
      .expect(200);

    expect(locRes.body.success).toBe(true);
    expect(locRes.body.data.replyText).toContain('Location');

    // Fee inquiry
    const feeRes = await request(app.getHttpServer())
      .post(`/api/clinics/${clinicA.id}/whatsapp/simulate-chat`)
      .send({
        phoneNumber: patientPhone,
        messageText: 'What is the consultation fee and cost?',
      })
      .expect(200);

    expect(feeRes.body.success).toBe(true);
    expect(feeRes.body.data.replyText).toContain('Consultation Fees');
  });
});
