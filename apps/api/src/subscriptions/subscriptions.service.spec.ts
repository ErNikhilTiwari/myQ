import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SubscriptionsService (Unit Tests & Quota Enforcement)', () => {
  let service: SubscriptionsService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      clinic: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
      subscription: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      subscriptionInvoice: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      doctor: { count: jest.fn() },
      clinicStaff: { count: jest.fn() },
      displayDevice: { count: jest.fn() },
    };

    service = new SubscriptionsService(prisma as unknown as PrismaService);
  });

  describe('getClinicSubscription', () => {
    it('throws NotFoundException if clinic does not exist', async () => {
      prisma.clinic.findUnique.mockResolvedValue(null);

      await expect(service.getClinicSubscription('nonexistent-clinic')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('auto-provisions FREE tier when clinic has no existing subscription record', async () => {
      prisma.clinic.findUnique.mockResolvedValue({ id: 'clinic-1', name: 'New Clinic' });
      prisma.subscription.findFirst.mockResolvedValue(null); // No subscription found

      const mockSub = {
        id: 'sub-new',
        clinicId: 'clinic-1',
        plan: 'FREE',
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        amountPaid: 0,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        maxDoctors: 2,
        maxStaff: 5,
        maxDisplays: 1,
        hasAds: true,
        clinic: { name: 'New Clinic' },
        invoices: [],
      };
      prisma.subscription.create.mockResolvedValue(mockSub);
      prisma.subscriptionInvoice.create.mockResolvedValue({});
      prisma.doctor.count.mockResolvedValue(1);
      prisma.clinicStaff.count.mockResolvedValue(2);
      prisma.displayDevice.count.mockResolvedValue(0);

      const sub = await service.getClinicSubscription('clinic-1');

      expect(prisma.subscription.create).toHaveBeenCalled();
      expect(sub.plan).toBe('FREE');
      expect(sub.status).toBe('ACTIVE');
      expect(sub.doctorsUsed).toBe(1);
      expect(sub.staffUsed).toBe(2);
    });

    it('returns existing subscription with current usage counts', async () => {
      prisma.clinic.findUnique.mockResolvedValue({ id: 'clinic-1', name: 'Existing Clinic' });

      const existingSub = {
        id: 'sub-1',
        clinicId: 'clinic-1',
        plan: 'PROFESSIONAL',
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        amountPaid: 2499,
        startDate: new Date(),
        endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        maxDoctors: 5,
        maxStaff: 10,
        maxDisplays: 3,
        hasAds: false,
        clinic: { name: 'Existing Clinic' },
        invoices: [],
      };
      prisma.subscription.findFirst.mockResolvedValue(existingSub);
      prisma.doctor.count.mockResolvedValue(3);
      prisma.clinicStaff.count.mockResolvedValue(4);
      prisma.displayDevice.count.mockResolvedValue(2);

      const sub = await service.getClinicSubscription('clinic-1');

      expect(sub.plan).toBe('PROFESSIONAL');
      expect(sub.doctorsUsed).toBe(3);
      expect(sub.displaysUsed).toBe(2);
      expect(sub.daysRemaining).toBeGreaterThanOrEqual(14);
    });
  });

  describe('renewOrUpgradeSubscription', () => {
    it('successfully extends subscription end date and generates invoice according to chosen billing cycle', async () => {
      prisma.clinic.findUnique.mockResolvedValue({ id: 'clinic-1', name: 'Demo Clinic' });
      const currentEnd = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      const existingSub = {
        id: 'sub-1',
        clinicId: 'clinic-1',
        plan: 'BASIC',
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        endDate: currentEnd,
        clinic: { id: 'clinic-1', name: 'Demo Clinic' },
      };
      prisma.subscription.findFirst
        .mockResolvedValueOnce(existingSub)
        .mockImplementation(async () => ({
          ...existingSub,
          billingCycle: 'YEARLY',
          endDate: new Date(currentEnd.getTime() + 365 * 24 * 60 * 60 * 1000),
          invoices: [],
        }));

      prisma.subscription.create.mockImplementation(({ data }: any) => ({
        id: 'sub-new-renewed',
        ...data,
        clinic: { id: 'clinic-1', name: 'Demo Clinic' },
      }));
      prisma.clinic.update.mockResolvedValue({});
      prisma.subscriptionInvoice.create.mockImplementation(({ data }: any) => ({
        id: 'inv-1',
        ...data,
      }));
      prisma.doctor.count.mockResolvedValue(1);
      prisma.clinicStaff.count.mockResolvedValue(1);
      prisma.displayDevice.count.mockResolvedValue(1);

      const result = await service.renewOrUpgradeSubscription('clinic-1', {
        plan: 'BASIC',
        billingCycle: 'YEARLY',
        paymentMethod: 'UPI',
      } as any);

      expect(prisma.subscription.create).toHaveBeenCalled();
      expect(prisma.subscriptionInvoice.create).toHaveBeenCalled();
      expect(result.subscription.billingCycle).toBe('YEARLY');
      expect(result.invoice.billingCycle).toBe('YEARLY');
      expect(new Date(result.subscription.endDate!).getTime()).toBeGreaterThan(currentEnd.getTime());
    });

    it('rejects invalid subscription plan', async () => {
      await expect(
        service.renewOrUpgradeSubscription('clinic-1', {
          plan: 'INVALID_TIER' as any,
          billingCycle: 'MONTHLY',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
