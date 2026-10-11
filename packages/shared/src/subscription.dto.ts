export type SubscriptionPlanType = 'FREE' | 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE';

export type SubscriptionStatusType = 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED';

export interface PlanLimitsDto {
  maxDoctors: number;
  maxStaff: number;
  maxDisplays: number;
  hasAds: boolean;
  priceMonthlyINR: number;
}

export const PLAN_LIMITS: Record<SubscriptionPlanType, PlanLimitsDto> = {
  FREE: {
    maxDoctors: 1,
    maxStaff: 2,
    maxDisplays: 1,
    hasAds: true,
    priceMonthlyINR: 0,
  },
  BASIC: {
    maxDoctors: 3,
    maxStaff: 5,
    maxDisplays: 2,
    hasAds: true,
    priceMonthlyINR: 999,
  },
  PROFESSIONAL: {
    maxDoctors: 10,
    maxStaff: 20,
    maxDisplays: 5,
    hasAds: false,
    priceMonthlyINR: 2499,
  },
  ENTERPRISE: {
    maxDoctors: 100,
    maxStaff: 200,
    maxDisplays: 25,
    hasAds: false,
    priceMonthlyINR: 7999,
  },
};

export interface UpgradeSubscriptionDto {
  plan: SubscriptionPlanType;
  durationMonths?: number;
}

export interface SubscriptionDto {
  id: string;
  clinicId: string;
  clinicName?: string;
  plan: SubscriptionPlanType;
  status: SubscriptionStatusType;
  startDate: string;
  endDate?: string | null;
  maxDoctors: number;
  maxStaff: number;
  maxDisplays: number;
  hasAds: boolean;
}
