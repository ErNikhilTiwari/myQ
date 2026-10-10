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
  ],
})
export class AppModule {}
