import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  SubscriptionDto,
  RenewSubscriptionDto,
  UpgradeSubscriptionDto,
  ExtendSubscriptionDto,
  SubscriptionInvoiceDto,
  SubscriptionPlanType,
  SubscriptionBillingCycle,
  PLAN_LIMITS,
} from '@queueapp/shared';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get clinic active subscription, quota limits, usage, and invoices
   */
  async getClinicSubscription(clinicId: string): Promise<SubscriptionDto> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
    });

    if (!clinic) {
      throw new NotFoundException(`Clinic with ID "${clinicId}" not found.`);
    }

    let sub = await this.prisma.subscription.findFirst({
      where: { clinicId },
      include: {
        clinic: true,
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!sub) {
      // Auto-provision default FREE tier for any clinic lacking one
      const limits = PLAN_LIMITS['FREE'];
      const defaultEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30-day initial trial
      sub = await this.prisma.subscription.create({
        data: {
          clinicId,
          plan: 'FREE',
          status: 'ACTIVE',
          billingCycle: 'MONTHLY',
          amountPaid: 0,
          startDate: new Date(),
          endDate: defaultEndDate,
          maxDoctors: limits.maxDoctors,
          maxStaff: limits.maxStaff,
          maxDisplays: limits.maxDisplays,
          hasAds: limits.hasAds,
        },
        include: {
          clinic: true,
          invoices: true,
        },
      });

      // Initial free trial invoice
      await this.prisma.subscriptionInvoice.create({
        data: {
          subscriptionId: sub.id,
          clinicId,
          invoiceNumber: `INV-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`,
          plan: 'FREE',
          billingCycle: 'MONTHLY',
          amount: 0,
          taxAmount: 0,
          totalAmount: 0,
          currency: 'INR',
          paymentMethod: 'FREE_TRIAL',
          paymentStatus: 'PAID',
          billingPeriodStart: sub.startDate,
          billingPeriodEnd: defaultEndDate,
        },
      });
    }

    // Usage counts
    const [doctorsUsed, staffUsed, displaysUsed] = await Promise.all([
      this.prisma.doctor.count({ where: { clinicId, isActive: true } }),
      this.prisma.clinicStaff.count({ where: { clinicId } }),
      this.prisma.displayDevice.count({ where: { clinicId } }),
    ]);

    return this.mapToDto(sub, doctorsUsed, staffUsed, displaysUsed);
  }

  /**
   * Clinic Admin: Renew or upgrade membership plan with Monthly, Quarterly, or Yearly billing
   */
  async renewOrUpgradeSubscription(
    clinicId: string,
    dto: RenewSubscriptionDto | UpgradeSubscriptionDto,
  ): Promise<{ subscription: SubscriptionDto; invoice: SubscriptionInvoiceDto }> {
    const limits = PLAN_LIMITS[dto.plan];
    if (!limits) {
      throw new BadRequestException(`Invalid subscription plan: ${dto.plan}`);
    }

    const billingCycle: SubscriptionBillingCycle =
      (dto as any).billingCycle || 'MONTHLY';

    // Calculate duration in days & pricing
    let durationDays = 30;
    let baseAmount = limits.priceMonthlyINR;

    if (billingCycle === 'QUARTERLY') {
      durationDays = 90;
      baseAmount = limits.priceQuarterlyINR;
    } else if (billingCycle === 'YEARLY') {
      durationDays = 365;
      baseAmount = limits.priceYearlyINR;
    }

    const taxAmount = baseAmount > 0 ? Math.round(baseAmount * 0.18) : 0; // 18% GST in India
    const totalAmount = baseAmount + taxAmount;

    // Fetch existing active subscription to compute rollover if valid
    const existing = await this.prisma.subscription.findFirst({
      where: { clinicId },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    let startDate = now;
    let endDate: Date;

    if (existing?.endDate && existing.endDate > now && existing.status !== 'SUSPENDED') {
      // Extend seamlessly from existing end date!
      endDate = new Date(existing.endDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
    } else {
      endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
    }

    // Upsert subscription
    const sub = await this.prisma.subscription.create({
      data: {
        clinicId,
        plan: dto.plan,
        status: 'ACTIVE',
        billingCycle,
        amountPaid: totalAmount,
        startDate,
        endDate,
        maxDoctors: limits.maxDoctors,
        maxStaff: limits.maxStaff,
        maxDisplays: limits.maxDisplays,
        hasAds: limits.hasAds,
      },
      include: { clinic: true },
    });

    // Make sure clinic is active
    await this.prisma.clinic.update({
      where: { id: clinicId },
      data: { isActive: true },
    });

    // Generate Invoice
    const invoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const invoiceRecord = await this.prisma.subscriptionInvoice.create({
      data: {
        subscriptionId: sub.id,
        clinicId,
        invoiceNumber,
        plan: dto.plan,
        billingCycle,
        amount: baseAmount,
        taxAmount,
        totalAmount,
        currency: 'INR',
        paymentMethod: (dto as any).paymentMethod || 'UPI',
        paymentStatus: 'PAID',
        transactionId: `TXN-${Date.now()}`,
        billingPeriodStart: startDate,
        billingPeriodEnd: endDate,
      },
    });

    this.logger.log(
      `💳 Clinic ${clinicId} renewed/upgraded to ${dto.plan} (${billingCycle}) until ${endDate.toISOString()}. Invoice ${invoiceNumber}`,
    );

    const subscriptionDto = await this.getClinicSubscription(clinicId);
    const invoiceDto = this.mapInvoiceToDto(invoiceRecord, sub.clinic?.name);

    return { subscription: subscriptionDto, invoice: invoiceDto };
  }

  /**
   * Super Admin: Manually extend subscription validity (Grant Trial or Grace Days)
   */
  async superExtendSubscription(
    clinicId: string,
    dto: ExtendSubscriptionDto,
    superAdminUserId: string,
  ): Promise<SubscriptionDto> {
    const existing = await this.prisma.subscription.findFirst({
      where: { clinicId },
      orderBy: { createdAt: 'desc' },
      include: { clinic: true },
    });

    if (!existing) {
      throw new NotFoundException(`No subscription found for clinic ${clinicId}`);
    }

    const additionalDays = dto.additionalDays || 30;
    const now = new Date();
    const baseDate = existing.endDate && existing.endDate > now ? existing.endDate : now;
    const newEndDate = new Date(baseDate.getTime() + additionalDays * 24 * 60 * 60 * 1000);

    const updated = await this.prisma.subscription.update({
      where: { id: existing.id },
      data: {
        status: 'ACTIVE',
        endDate: newEndDate,
      },
      include: { clinic: true },
    });

    // Log administrative override invoice
    await this.prisma.subscriptionInvoice.create({
      data: {
        subscriptionId: updated.id,
        clinicId,
        invoiceNumber: `EXT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
        plan: updated.plan,
        billingCycle: (updated as any).billingCycle || 'MONTHLY',
        amount: 0,
        taxAmount: 0,
        totalAmount: 0,
        currency: 'INR',
        paymentMethod: 'MANUAL_OVERRIDE',
        paymentStatus: 'PAID',
        transactionId: `ADMIN-GRANT-${superAdminUserId.slice(0, 8)}`,
        billingPeriodStart: now,
        billingPeriodEnd: newEndDate,
      },
    });

    await this.prisma.clinic.update({
      where: { id: clinicId },
      data: { isActive: true },
    });

    this.logger.log(
      `👑 Super Admin ${superAdminUserId} extended clinic ${clinicId} subscription by ${additionalDays} days to ${newEndDate.toISOString()}`,
    );

    return this.getClinicSubscription(clinicId);
  }

  /**
   * Super Admin lists all clinic subscriptions across platform enriched with metrics
   */
  async listAllSubscriptions(): Promise<SubscriptionDto[]> {
    const clinics = await this.prisma.clinic.findMany({
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            invoices: {
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
          },
        },
        _count: {
          select: {
            doctors: true,
            staff: true,
            displayDevices: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return clinics.map((c) => {
      const sub = c.subscriptions?.[0];
      const limits = PLAN_LIMITS[(sub?.plan as SubscriptionPlanType) || 'FREE'] || PLAN_LIMITS.FREE;

      if (!sub) {
        return {
          id: `virtual-${c.id}`,
          clinicId: c.id,
          clinicName: c.name,
          clinicSlug: c.slug,
          plan: 'FREE' as SubscriptionPlanType,
          status: (c.isActive ? 'ACTIVE' : 'SUSPENDED') as any,
          billingCycle: 'MONTHLY',
          amountPaid: 0,
          startDate: c.createdAt.toISOString(),
          endDate: null,
          maxDoctors: limits.maxDoctors,
          maxStaff: limits.maxStaff,
          maxDisplays: limits.maxDisplays,
          hasAds: limits.hasAds,
          daysRemaining: 999,
          isExpiringSoon: false,
          isExpired: false,
          doctorsUsed: c._count.doctors,
          staffUsed: c._count.staff,
          displaysUsed: c._count.displayDevices,
          invoices: [],
        };
      }

      return this.mapToDto(sub, c._count.doctors, c._count.staff, c._count.displayDevices, c.name, c.slug);
    });
  }

  /**
   * Get clinic invoices
   */
  async getClinicInvoices(clinicId: string): Promise<SubscriptionInvoiceDto[]> {
    const invoices = await this.prisma.subscriptionInvoice.findMany({
      where: { clinicId },
      include: { clinic: true },
      orderBy: { createdAt: 'desc' },
    });

    return invoices.map((inv) => this.mapInvoiceToDto(inv, inv.clinic?.name));
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
        `Subscription plan limit reached: Your ${sub.plan} plan allows up to ${sub.maxDoctors} doctors. Please upgrade your subscription to add more doctors.`,
      );
    }
  }

  private mapToDto(
    s: any,
    doctorsUsed: number = 0,
    staffUsed: number = 0,
    displaysUsed: number = 0,
    clinicNameOverride?: string,
    clinicSlugOverride?: string,
  ): SubscriptionDto {
    const now = new Date();
    const endDate = s.endDate ? new Date(s.endDate) : null;

    let daysRemaining = 999;
    let isExpired = false;
    let isExpiringSoon = false;
    let dynamicStatus = s.status || 'ACTIVE';

    if (endDate) {
      const diffTime = endDate.getTime() - now.getTime();
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (daysRemaining <= 0) {
        isExpired = true;
        daysRemaining = 0;
        if (dynamicStatus !== 'SUSPENDED') {
          dynamicStatus = 'EXPIRED';
        }
      } else if (daysRemaining <= 7) {
        isExpiringSoon = true;
        if (dynamicStatus === 'ACTIVE') {
          dynamicStatus = 'EXPIRING_SOON';
        }
      }
    }

    if (s.clinic?.isActive === false && dynamicStatus !== 'EXPIRED') {
      dynamicStatus = 'SUSPENDED';
    }

    const invoices = s.invoices ? s.invoices.map((inv: any) => this.mapInvoiceToDto(inv, s.clinic?.name || clinicNameOverride)) : [];

    return {
      id: s.id,
      clinicId: s.clinicId,
      clinicName: s.clinic?.name || clinicNameOverride,
      clinicSlug: s.clinic?.slug || clinicSlugOverride,
      plan: s.plan as SubscriptionPlanType,
      status: dynamicStatus as any,
      billingCycle: (s.billingCycle as SubscriptionBillingCycle) || 'MONTHLY',
      amountPaid: s.amountPaid || 0,
      startDate: s.startDate ? new Date(s.startDate).toISOString() : new Date().toISOString(),
      endDate: endDate ? endDate.toISOString() : null,
      maxDoctors: s.maxDoctors,
      maxStaff: s.maxStaff,
      maxDisplays: s.maxDisplays,
      hasAds: s.hasAds,
      daysRemaining,
      isExpiringSoon,
      isExpired,
      doctorsUsed,
      staffUsed,
      displaysUsed,
      invoices,
    };
  }

  private mapInvoiceToDto(inv: any, clinicName?: string): SubscriptionInvoiceDto {
    return {
      id: inv.id,
      subscriptionId: inv.subscriptionId,
      clinicId: inv.clinicId,
      clinicName,
      invoiceNumber: inv.invoiceNumber,
      plan: inv.plan as SubscriptionPlanType,
      billingCycle: (inv.billingCycle as SubscriptionBillingCycle) || 'MONTHLY',
      amount: inv.amount,
      taxAmount: inv.taxAmount,
      totalAmount: inv.totalAmount,
      currency: inv.currency || 'INR',
      paymentMethod: inv.paymentMethod,
      paymentStatus: inv.paymentStatus,
      transactionId: inv.transactionId || null,
      billingPeriodStart: inv.billingPeriodStart ? new Date(inv.billingPeriodStart).toISOString() : new Date().toISOString(),
      billingPeriodEnd: inv.billingPeriodEnd ? new Date(inv.billingPeriodEnd).toISOString() : new Date().toISOString(),
      paidAt: inv.paidAt ? new Date(inv.paidAt).toISOString() : new Date().toISOString(),
    };
  }
}
