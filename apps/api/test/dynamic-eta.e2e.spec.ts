import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { QueuesService } from '../src/queues/queues.service';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';

describe('Phase 2 — Advanced Dynamic ETA Prediction (E2E Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let queuesService: QueuesService;

  let clinicA: any;
  let queueA: any;
  let doctorA: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    prisma = app.get(PrismaService);
    queuesService = app.get(QueuesService);

    clinicA = await prisma.clinic.findUnique({ where: { slug: 'abc-health' } });
    doctorA = await prisma.doctor.findFirst({ where: { clinicId: clinicA.id } });
    queueA = await prisma.queue.findFirst({ where: { clinicId: clinicA.id } });
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('1. Default fallback: when no historical completed tokens exist, uses baseline estimate (15 min/patient)', async () => {
    const eta = await queuesService.calculateDynamicETA(
      queueA.id,
      doctorA.id,
      4, // 4 people ahead
    );

    // 4 people * 15 min = 60 min
    expect(eta).toBe(60);
  });

  it('2. Rolling Historical Adaptation: when doctor averages 8 minutes per consultation, ETA dynamically adjusts', async () => {
    const sampleUser = await prisma.user.findFirst();
    const now = Date.now();
    // Simulate 3 completed tokens where each took exactly 8 minutes (480,000 ms)
    await prisma.queueEntry.createMany({
      data: [
        {
          queueId: queueA.id,
          userId: sampleUser!.id,
          tokenNumber: 'HIST-01',
          sequenceNumber: 991,
          status: 'COMPLETED',
          publicToken: `qt_hist_01_${now}`,
          startedAt: new Date(now - 30 * 60 * 1000),
          completedAt: new Date(now - 22 * 60 * 1000), // 8 min
        },
        {
          queueId: queueA.id,
          userId: sampleUser!.id,
          tokenNumber: 'HIST-02',
          sequenceNumber: 992,
          status: 'COMPLETED',
          publicToken: `qt_hist_02_${now}`,
          startedAt: new Date(now - 20 * 60 * 1000),
          completedAt: new Date(now - 12 * 60 * 1000), // 8 min
        },
        {
          queueId: queueA.id,
          userId: sampleUser!.id,
          tokenNumber: 'HIST-03',
          sequenceNumber: 993,
          status: 'COMPLETED',
          publicToken: `qt_hist_03_${now}`,
          startedAt: new Date(now - 10 * 60 * 1000),
          completedAt: new Date(now - 2 * 60 * 1000), // 8 min
        },
      ],
    });

    const dynamicEta = await queuesService.calculateDynamicETA(
      queueA.id,
      doctorA.id,
      5, // 5 people ahead
    );

    // 5 people * 8 min average = 40 min (instead of 75 min static)
    expect(dynamicEta).toBe(40);
  });

  it('3. Public Token API reflects calculated dynamic ETA without authentication', async () => {
    const sampleUser = await prisma.user.findFirst();
    const testPublicToken = `qt_dyn_eta_test_${Date.now()}`;
    const entry = await prisma.queueEntry.create({
      data: {
        queueId: queueA.id,
        userId: sampleUser!.id,
        tokenNumber: 'TEST-ETA',
        sequenceNumber: 999,
        status: 'WAITING',
        publicToken: testPublicToken,
      },
    });

    const res = await request(app.getHttpServer())
      .get(`/api/queue/${testPublicToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.tokenNumber).toBe('TEST-ETA');
    expect(typeof res.body.data.estimatedWaitMinutes).toBe('number');
  });
});
