export type SubscriptionPlanType = 'FREE' | 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE';

export type SubscriptionStatusType = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'PAST_DUE' | 'CANCELLED' | 'SUSPENDED';

export type SubscriptionBillingCycle = 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface PlanLimitsDto {
  name: string;
  tagline: string;
  maxDoctors: number;
  maxStaff: number;
  maxDisplays: number;
  hasAds: boolean;
  priceMonthlyINR: number;
  priceQuarterlyINR: number; // 10% discount
  priceYearlyINR: number;    // 20% discount
  features: string[];
  recommended?: boolean;
}

export const PLAN_LIMITS: Record<SubscriptionPlanType, PlanLimitsDto> = {
  FREE: {
    name: 'Starter Free',
    tagline: 'Ideal for single-practitioner clinics getting started',
    maxDoctors: 1,
    maxStaff: 2,
    maxDisplays: 1,
    hasAds: true,
    priceMonthlyINR: 0,
    priceQuarterlyINR: 0,
    priceYearlyINR: 0,
    features: [
      '1 Doctor Chamber',
      '2 Front Desk Staff / Receptionists',
      '1 Waiting Room Smart TV Display',
      'Basic In-Clinic Token Queue',
      'Remote Patient Token Tracking',
      'Standard Audio Chime Callouts',
      'Sponsor Banner Ads on Display',
    ],
  },
  BASIC: {
    name: 'Essential Practice',
    tagline: 'Growing multi-room medical practices & dispensaries',
    maxDoctors: 3,
    maxStaff: 5,
    maxDisplays: 2,
    hasAds: true,
    priceMonthlyINR: 999,
    priceQuarterlyINR: 2697, // ~10% off (₹899/mo)
    priceYearlyINR: 9590,    // ~20% off (₹799/mo)
    features: [
      'Up to 3 Doctor Chambers',
      '5 Front Desk & Staff Accounts',
      '2 Smart TV Queue Displays',
      'Indian Voice Callouts (Hindi & English)',
      'Dual Walk-in & Remote Pricing Rules',
      'Real-time Queue Hold & Recall Control',
      'WhatsApp Patient Notifications',
      'Daily PDF Patient Reports',
    ],
  },
  PROFESSIONAL: {
    name: 'Professional Clinic',
    tagline: 'High-volume clinics & multi-specialty polyclinics',
    maxDoctors: 10,
    maxStaff: 20,
    maxDisplays: 5,
    hasAds: false,
    priceMonthlyINR: 2499,
    priceQuarterlyINR: 6747, // ~10% off (₹2,249/mo)
    priceYearlyINR: 23990,   // ~20% off (₹1,999/mo)
    recommended: true,
    features: [
      'Up to 10 Doctor Chambers',
      '20 Staff & Receptionist Profiles',
      '5 Waiting Room TV Screens & Monitors',
      '✨ 100% Ad-Free Clean Display Experience',
      'Advanced Multi-Language Voice Synthesis',
      'Custom Token Sequences & Department Queues',
      'Revenue & Wait Time Analytics Dashboard',
      'Automated SMS & WhatsApp Alerts',
      'Priority Phone & WhatsApp Support',
    ],
  },
  ENTERPRISE: {
    name: 'Hospital & Chain Enterprise',
    tagline: 'Hospital chains, medical centers & enterprise healthcare',
    maxDoctors: 100,
    maxStaff: 200,
    maxDisplays: 25,
    hasAds: false,
    priceMonthlyINR: 7999,
    priceQuarterlyINR: 21597, // ~10% off (₹7,199/mo)
    priceYearlyINR: 76790,    // ~20% off (₹6,399/mo)
    features: [
      'Up to 100 Doctor Chambers',
      '200 Multi-Location Staff Accounts',
      '25 Smart TV Screens Across Wards',
      '100% Ad-Free Zero-Distraction TV Display',
      'Hospital Chain Multi-Branch Synchronization',
      'Complete Audit Log Tracking & Security',
      'Custom SLA & 24/7 Dedicated Account Manager',
      'API & Hospital EMR / HIS Integration Support',
    ],
  },
};

export interface UpgradeSubscriptionDto {
  plan: SubscriptionPlanType;
  durationMonths?: number;
  billingCycle?: SubscriptionBillingCycle;
  paymentMethod?: 'UPI' | 'CARD' | 'NETBANKING' | 'MANUAL_OVERRIDE';
}

export interface RenewSubscriptionDto {
  plan: SubscriptionPlanType;
  billingCycle: SubscriptionBillingCycle;
  paymentMethod?: 'UPI' | 'CARD' | 'NETBANKING' | 'MANUAL_OVERRIDE';
}

export interface ExtendSubscriptionDto {
  additionalDays: number;
  reason?: string;
}

export interface SubscriptionInvoiceDto {
  id: string;
  subscriptionId: string;
  clinicId: string;
  clinicName?: string;
  invoiceNumber: string;
  plan: SubscriptionPlanType;
  billingCycle: SubscriptionBillingCycle;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  paymentMethod: string;
  paymentStatus: string;
  transactionId?: string | null;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  paidAt: string;
}

export interface SubscriptionDto {
  id: string;
  clinicId: string;
  clinicName?: string;
  clinicSlug?: string;
  plan: SubscriptionPlanType;
  status: SubscriptionStatusType;
  billingCycle: SubscriptionBillingCycle;
  amountPaid: number;
  startDate: string;
  endDate?: string | null;
  maxDoctors: number;
  maxStaff: number;
  maxDisplays: number;
  hasAds: boolean;
  // Dynamic computed fields
  daysRemaining: number;
  isExpiringSoon: boolean;
  isExpired: boolean;
  doctorsUsed: number;
  staffUsed: number;
  displaysUsed: number;
  invoices?: SubscriptionInvoiceDto[];
}
