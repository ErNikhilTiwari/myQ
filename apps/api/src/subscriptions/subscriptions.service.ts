import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  SubscriptionDto,
  UpgradeSubscriptionDto,
  SubscriptionPlanType,
  PLAN_LIMITS,
} from '@queueapp/shared';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get clinic active subscription and quota limits
   */
  async getClinicSubscription(clinicId: string): Promise<SubscriptionDto> {
    let sub = await this.prisma.subscription.findFirst({
      where: { clinicId },
      include: { clinic: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!sub) {
      // Default to FREE tier
      const limits = PLAN_LIMITS['FREE'];
      sub = await this.prisma.subscription.create({
        data: {
          clinicId,
          plan: 'FREE',
          status: 'ACTIVE',
          maxDoctors: limits.maxDoctors,
          maxStaff: limits.maxStaff,
          maxDisplays: limits.maxDisplays,
          hasAds: limits.hasAds,
        },
        include: { clinic: true },
      });
    }

    return this.mapToDto(sub);
  }

  /**
   * Upgrade clinic subscription plan
   */
  async upgradeSubscription(
    clinicId: string,
    dto: UpgradeSubscriptionDto,
  ): Promise<SubscriptionDto> {
    const limits = PLAN_LIMITS[dto.plan];
    if (!limits) {
      throw new BadRequestException(`Invalid subscription plan: ${dto.plan}`);
    }

    const durationMonths = dto.durationMonths || 1;
    const endDate = new Date(Date.now() + durationMonths * 30 * 24 * 60 * 60 * 1000);

    const sub = await this.prisma.subscription.create({
      data: {
        clinicId,
        plan: dto.plan,
        status: 'ACTIVE',
        maxDoctors: limits.maxDoctors,
        maxStaff: limits.maxStaff,
        maxDisplays: limits.maxDisplays,
        hasAds: limits.hasAds,
        endDate,
      },
      include: { clinic: true },
    });

    this.logger.log(`💳 Clinic ${clinicId} upgraded to plan ${dto.plan} until ${endDate.toISOString()}`);
    return this.mapToDto(sub);
  }

  /**
   * Check if action conforms to subscription limits (Enforcement guard)
   */
  async enforceDoctorLimit(clinicId: string): Promise<void> {
    const sub = await this.getClinicSubscription(clinicId);
    const doctorCount = await this.prisma.doctor.count({
      where: { clinicId, isActive: true },
    });

    if (doctorCount >= sub.maxDoctors) {
      throw new BadRequestException(
        `Subscription plan limit reached: Your ${sub.plan} plan allows up to ${sub.maxDoctors} doctors. Please upgrade to add more doctors.`,
      );
    }
  }

  /**
   * Super Admin lists all active clinic subscriptions
   */
  async listAllSubscriptions(): Promise<SubscriptionDto[]> {
    const list = await this.prisma.subscription.findMany({
      include: { clinic: true },
      orderBy: { createdAt: 'desc' },
    });

    return list.map((s) => this.mapToDto(s));
  }

  private mapToDto(s: any): SubscriptionDto {
    return {
      id: s.id,
      clinicId: s.clinicId,
      clinicName: s.clinic?.name,
      plan: s.plan as SubscriptionPlanType,
      status: s.status,
      startDate: s.startDate.toISOString(),
      endDate: s.endDate ? s.endDate.toISOString() : null,
      maxDoctors: s.maxDoctors,
      maxStaff: s.maxStaff,
      maxDisplays: s.maxDisplays,
      hasAds: s.hasAds,
    };
  }
}
