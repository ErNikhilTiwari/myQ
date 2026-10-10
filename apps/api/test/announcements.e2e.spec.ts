import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';

describe('Announcement System & Voice Callouts (E2E Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let clinicA: any;
  let clinicB: any;
  let receptionistAToken: string;
  let delayAnnouncementId: string;

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
    clinicB = await prisma.clinic.findUnique({ where: { slug: 'city-dental' } });

    // Clean test announcements for clinic A
    await prisma.announcement.deleteMany({ where: { clinicId: clinicA.id } });

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
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('1. Receptionist creates Doctor Delay Ticker announcement', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/clinics/${clinicA.id}/announcements`)
      .set('Authorization', `Bearer ${receptionistAToken}`)
      .send({
        title: 'Doctor Delay: Dr. Sharma',
        messageEn: 'Dr. Sharma is running 25 minutes late due to an emergency surgery.',
        messageHi: 'डॉ. शर्मा आपातकालीन सर्जरी के कारण 25 मिनट देरी से चल रहे हैं।',
        type: 'DELAY',
        priority: 'HIGH',
        displayMode: 'TICKER',
        audioMode: 'CHIME',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.displayMode).toBe('TICKER');
    expect(res.body.data.priority).toBe('HIGH');
    expect(res.body.data.messageHi).toContain('25 मिनट');

    delayAnnouncementId = res.body.data.id;
  });

  it('2. Dual Voice Callout generator returns English and Hindi speech strings (ADR-008)', async () => {
    const res = await request(app.getHttpServer())
      .get(
        `/api/clinics/${clinicA.id}/announcements/callout-voice?tokenNumber=A-05&roomNumber=101&doctorName=Ramesh Sharma`,
      )
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.englishSpeech).toBe(
      'Token A-05, please proceed to Room 101, with Dr. Ramesh Sharma.',
    );
    expect(res.body.data.hindiSpeech).toContain('टोकन A-05, कृपया कमरा नंबर 101');
    expect(res.body.data.hindiSpeech).toContain('डॉ. Ramesh Sharma');
  });

  it('3. Public active announcements endpoint returns active tickers without authentication', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/clinics/${clinicA.id}/announcements/active`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);

    const delay = res.body.data.find((a: any) => a.id === delayAnnouncementId);
    expect(delay).toBeDefined();
    expect(delay.type).toBe('DELAY');
  });

  it('4. Receptionist triggers Emergency Full-Screen Takeover (Highest Priority)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/clinics/${clinicA.id}/announcements/emergency`)
      .set('Authorization', `Bearer ${receptionistAToken}`)
      .send({
        title: 'Fire Alarm Test',
        messageEn: 'Please remain seated, this is a routine building safety drill.',
        messageHi: 'कृपया बैठे रहें, यह एक नियमित सुरक्षा अभ्यास है।',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.priority).toBe('CRITICAL');
    expect(res.body.data.displayMode).toBe('FULLSCREEN_TAKEOVER');

    // Verify active list now has the emergency takeover at the very TOP (index 0)
    const activeRes = await request(app.getHttpServer())
      .get(`/api/clinics/${clinicA.id}/announcements/active`)
      .expect(200);

    expect(activeRes.body.data[0].priority).toBe('CRITICAL');
    expect(activeRes.body.data[0].displayMode).toBe('FULLSCREEN_TAKEOVER');
  });

  it('5. Tenant isolation: Receptionist A cannot create announcements in Clinic B', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/clinics/${clinicB.id}/announcements`)
      .set('Authorization', `Bearer ${receptionistAToken}`)
      .send({
        title: 'Hacked Announcement',
        messageEn: 'Malicious content',
        type: 'INFO',
      })
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Cross-tenant access violation');
  });
});
