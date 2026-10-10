import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { QueueEntryStatus } from '@queueapp/shared';

describe('Queue Core & State Machine (E2E Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let clinicA: any;
  let queueA: any;
  let receptionistAToken: string;
  let patientUser: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    prisma = app.get(PrismaService);

    // Fetch seeded clinic A and its queue
    clinicA = await prisma.clinic.findUnique({ where: { slug: 'abc-health' } });
    queueA = await prisma.queue.findFirst({ where: { clinicId: clinicA.id } });

    // Clean existing queue entries in queueA for fresh isolated tests
    await prisma.queueEntry.deleteMany({ where: { queueId: queueA.id } });
    await prisma.queue.update({ where: { id: queueA.id }, data: { currentSeq: 0 } });

    // Login Receptionist A (+919876500001)
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
    receptionistAToken = recRes.body.data.tokens.accessToken;

    // Get sample patient
    patientUser = await prisma.user.findUnique({ where: { phoneNumber: '+919876511111' } });
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('1. Atomic Sequence Token Issuance', () => {
    it('issues sequential tokens A-01 and A-02', async () => {
      const res1 = await request(app.getHttpServer())
        .post(`/api/clinics/${clinicA.id}/queues/${queueA.id}/issue-token`)
        .set('Authorization', `Bearer ${receptionistAToken}`)
        .send({ userId: patientUser.id, tokenPrefix: 'A' })
        .expect(201);

      expect(res1.body.success).toBe(true);
      expect(res1.body.data.tokenNumber).toBe('A-01');
      expect(res1.body.data.sequenceNumber).toBe(1);
      expect(res1.body.data.publicToken).toMatch(/^qt_/);

      const res2 = await request(app.getHttpServer())
        .post(`/api/clinics/${clinicA.id}/queues/${queueA.id}/issue-token`)
        .set('Authorization', `Bearer ${receptionistAToken}`)
        .send({ userId: patientUser.id, tokenPrefix: 'A' })
        .expect(201);

      expect(res2.body.data.tokenNumber).toBe('A-02');
      expect(res2.body.data.sequenceNumber).toBe(2);
    });

    it('handles concurrent token issuance without duplicate sequence numbers', async () => {
      // Fire 5 token requests concurrently
      const requests = Array.from({ length: 5 }).map(() =>
        request(app.getHttpServer())
          .post(`/api/clinics/${clinicA.id}/queues/${queueA.id}/issue-token`)
          .set('Authorization', `Bearer ${receptionistAToken}`)
          .send({ userId: patientUser.id, tokenPrefix: 'A' }),
      );

      const results = await Promise.all(requests);
      results.forEach((res) => expect(res.status).toBe(201));

      const seqNumbers = results.map((r) => r.body.data.sequenceNumber);
      const uniqueSeqs = new Set(seqNumbers);
      expect(uniqueSeqs.size).toBe(5); // all 5 sequence numbers are completely unique!
    });
  });

  describe('2. State Machine Transitions', () => {
    let tokenEntry: any;

    beforeEach(async () => {
      // Issue a fresh token for transition tests
      const res = await request(app.getHttpServer())
        .post(`/api/clinics/${clinicA.id}/queues/${queueA.id}/issue-token`)
        .set('Authorization', `Bearer ${receptionistAToken}`)
        .send({ userId: patientUser.id, tokenPrefix: 'T' });
      tokenEntry = res.body.data;
    });

    it('normal path: WAITING -> CALLED -> IN_SERVICE -> COMPLETED', async () => {
      // 1. WAITING -> CALLED
      const callRes = await request(app.getHttpServer())
        .post(`/api/clinics/${clinicA.id}/queues/entries/${tokenEntry.id}/transition`)
        .set('Authorization', `Bearer ${receptionistAToken}`)
        .send({ targetStatus: QueueEntryStatus.CALLED })
        .expect(200);
      expect(callRes.body.data.status).toBe(QueueEntryStatus.CALLED);
      expect(callRes.body.data.calledAt).toBeDefined();

      // 2. CALLED -> IN_SERVICE
      const startRes = await request(app.getHttpServer())
        .post(`/api/clinics/${clinicA.id}/queues/entries/${tokenEntry.id}/transition`)
        .set('Authorization', `Bearer ${receptionistAToken}`)
        .send({ targetStatus: QueueEntryStatus.IN_SERVICE })
        .expect(200);
      expect(startRes.body.data.status).toBe(QueueEntryStatus.IN_SERVICE);

      // 3. IN_SERVICE -> COMPLETED
      const doneRes = await request(app.getHttpServer())
        .post(`/api/clinics/${clinicA.id}/queues/entries/${tokenEntry.id}/transition`)
        .set('Authorization', `Bearer ${receptionistAToken}`)
        .send({ targetStatus: QueueEntryStatus.COMPLETED })
        .expect(200);
      expect(doneRes.body.data.status).toBe(QueueEntryStatus.COMPLETED);
    });

    it('hold & recall path: CALLED -> ON_HOLD with reason -> CALLED (recall from hold)', async () => {
      // Call token first
      await request(app.getHttpServer())
        .post(`/api/clinics/${clinicA.id}/queues/entries/${tokenEntry.id}/transition`)
        .set('Authorization', `Bearer ${receptionistAToken}`)
        .send({ targetStatus: QueueEntryStatus.CALLED });

      // Put ON_HOLD
      const holdRes = await request(app.getHttpServer())
        .post(`/api/clinics/${clinicA.id}/queues/entries/${tokenEntry.id}/transition`)
        .set('Authorization', `Bearer ${receptionistAToken}`)
        .send({
          targetStatus: QueueEntryStatus.ON_HOLD,
          holdReason: 'Awaiting blood test results from diagnostic lab',
        })
        .expect(200);

      expect(holdRes.body.data.status).toBe(QueueEntryStatus.ON_HOLD);
      expect(holdRes.body.data.holdReason).toBe('Awaiting blood test results from diagnostic lab');

      // Recall from hold (ON_HOLD -> CALLED)
      const recallRes = await request(app.getHttpServer())
        .post(`/api/clinics/${clinicA.id}/queues/entries/${tokenEntry.id}/transition`)
        .set('Authorization', `Bearer ${receptionistAToken}`)
        .send({ targetStatus: QueueEntryStatus.CALLED })
        .expect(200);

      expect(recallRes.body.data.status).toBe(QueueEntryStatus.CALLED);
    });

    it('skip & recall path: CALLED -> SKIPPED -> CALLED', async () => {
      // Call token
      await request(app.getHttpServer())
        .post(`/api/clinics/${clinicA.id}/queues/entries/${tokenEntry.id}/transition`)
        .set('Authorization', `Bearer ${receptionistAToken}`)
        .send({ targetStatus: QueueEntryStatus.CALLED });

      // Skip token
      const skipRes = await request(app.getHttpServer())
        .post(`/api/clinics/${clinicA.id}/queues/entries/${tokenEntry.id}/transition`)
        .set('Authorization', `Bearer ${receptionistAToken}`)
        .send({ targetStatus: QueueEntryStatus.SKIPPED })
        .expect(200);
      expect(skipRes.body.data.status).toBe(QueueEntryStatus.SKIPPED);

      // Recall skipped token
      const recallRes = await request(app.getHttpServer())
        .post(`/api/clinics/${clinicA.id}/queues/entries/${tokenEntry.id}/transition`)
        .set('Authorization', `Bearer ${receptionistAToken}`)
        .send({ targetStatus: QueueEntryStatus.CALLED })
        .expect(200);
      expect(recallRes.body.data.status).toBe(QueueEntryStatus.CALLED);
    });

    it('rejects invalid state transition: WAITING -> COMPLETED directly (400 Bad Request)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/clinics/${clinicA.id}/queues/entries/${tokenEntry.id}/transition`)
        .set('Authorization', `Bearer ${receptionistAToken}`)
        .send({ targetStatus: QueueEntryStatus.COMPLETED })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Invalid queue transition');
    });
  });

  describe('3. Concurrency-Safe Call Next', () => {
    it('calling next auto-completes the previously called patient', async () => {
      // Clean queue
      await prisma.queueEntry.deleteMany({ where: { queueId: queueA.id } });

      // Issue 2 tokens
      await request(app.getHttpServer())
        .post(`/api/clinics/${clinicA.id}/queues/${queueA.id}/issue-token`)
        .set('Authorization', `Bearer ${receptionistAToken}`)
        .send({ userId: patientUser.id });
      await request(app.getHttpServer())
        .post(`/api/clinics/${clinicA.id}/queues/${queueA.id}/issue-token`)
        .set('Authorization', `Bearer ${receptionistAToken}`)
        .send({ userId: patientUser.id });

      // Call 1st token
      const call1 = await request(app.getHttpServer())
        .post(`/api/clinics/${clinicA.id}/queues/${queueA.id}/call-next`)
        .set('Authorization', `Bearer ${receptionistAToken}`)
        .expect(200);

      expect(call1.body.data.calledEntry).toBeDefined();
      const firstTokenId = call1.body.data.calledEntry.id;

      // Call 2nd token
      const call2 = await request(app.getHttpServer())
        .post(`/api/clinics/${clinicA.id}/queues/${queueA.id}/call-next`)
        .set('Authorization', `Bearer ${receptionistAToken}`)
        .expect(200);

      expect(call2.body.data.previousEntryCompleted).toBe(true);

      // Verify 1st token is now COMPLETED
      const checkFirst = await prisma.queueEntry.findUnique({ where: { id: firstTokenId } });
      expect(checkFirst?.status).toBe(QueueEntryStatus.COMPLETED);
    });
  });

  describe('4. Public QR Token Lookup (Zero Auth)', () => {
    it('returns sanitized public status without PII via publicToken', async () => {
      // Issue token
      const issueRes = await request(app.getHttpServer())
        .post(`/api/clinics/${clinicA.id}/queues/${queueA.id}/issue-token`)
        .set('Authorization', `Bearer ${receptionistAToken}`)
        .send({ userId: patientUser.id });

      const pubToken = issueRes.body.data.publicToken;

      const pubRes = await request(app.getHttpServer())
        .get(`/api/queue/${pubToken}`)
        .expect(200);

      expect(pubRes.body.success).toBe(true);
      expect(pubRes.body.data.tokenNumber).toBe(issueRes.body.data.tokenNumber);
      expect(pubRes.body.data.clinicName).toBe(clinicA.name);
      expect(pubRes.body.data.positionAhead).toBeGreaterThanOrEqual(0);

      // Verify zero sensitive PII is returned
      expect(pubRes.body.data.id).toBeUndefined();
      expect(pubRes.body.data.userId).toBeUndefined();
      expect(pubRes.body.data.phoneNumber).toBeUndefined();
    });
  });
});
