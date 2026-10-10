import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';

describe('Public QR & Manual Token Lookup (E2E Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let clinicA: any;
  let queueA: any;
  let testEntry: any;

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
    queueA = await prisma.queue.findFirst({ where: { clinicId: clinicA.id } });
    const patientUser = await prisma.user.findUnique({ where: { phoneNumber: '+919876511111' } });

    // Create a known token entry for testing
    testEntry = await prisma.queueEntry.create({
      data: {
        queueId: queueA.id,
        userId: patientUser!.id,
        tokenNumber: 'Q-77',
        sequenceNumber: 77,
        status: 'WAITING',
        publicToken: 'qt_public_test_qr_77',
        estimatedWait: 30,
      },
    });
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('1. Public QR lookup via non-guessable token requires NO authentication', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/queue/${testEntry.publicToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.tokenNumber).toBe('Q-77');
    expect(res.body.data.clinicName).toBe(clinicA.name);
    expect(res.body.data.status).toBe('WAITING');
    expect(res.body.data.estimatedWaitMinutes).toBeDefined();

    // Verify ZERO patient personal information is exposed
    expect(res.body.data.id).toBeUndefined();
    expect(res.body.data.userId).toBeUndefined();
    expect(res.body.data.phoneNumber).toBeUndefined();
    expect(res.body.data.name).toBeUndefined();
  });

  it('2. Manual lookup by clinicSlug and tokenNumber requires NO authentication', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/queue/lookup?clinicSlug=${clinicA.slug}&tokenNumber=Q-77`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.tokenNumber).toBe('Q-77');
    expect(res.body.data.clinicName).toBe(clinicA.name);
  });

  it('3. Manual lookup is case-insensitive (e.g. q-77 matches Q-77)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/queue/lookup?clinicSlug=${clinicA.slug}&tokenNumber=q-77`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.tokenNumber).toBe('Q-77');
  });

  it('4. Rejects invalid token with friendly 404 error envelope', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/queue/lookup?clinicSlug=${clinicA.slug}&tokenNumber=INVALID-999`)
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('not found in clinic');
  });

  it('5. Rejects invalid clinic with 404 error envelope', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/queue/lookup?clinicSlug=non-existent-clinic&tokenNumber=Q-77')
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('not found');
  });
});
