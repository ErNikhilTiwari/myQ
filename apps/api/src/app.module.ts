import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { ClinicsModule } from './clinics/clinics.module';
import { DoctorsModule } from './doctors/doctors.module';
import { ServicesModule } from './services/services.module';
import { QueuesModule } from './queues/queues.module';
import { ReceptionistModule } from './receptionist/receptionist.module';
import { ViewerModule } from './viewer/viewer.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { PaymentsModule } from './payments/payments.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { AdsModule } from './ads/ads.module';
import { ReportsModule } from './reports/reports.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { PushNotificationsModule } from './push/push-notifications.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    HealthModule,
    ClinicsModule,
    DoctorsModule,
    ServicesModule,
    QueuesModule,
    ReceptionistModule,
    ViewerModule,
    AnnouncementsModule,
    AppointmentsModule,
    PaymentsModule,
    WhatsAppModule,
    AdsModule,
    ReportsModule,
    SubscriptionsModule,
    PushNotificationsModule,
  ],
})
export class AppModule {}

