export interface DailyReportDto {
  clinicId: string;
  clinicName: string;
  date: string; // YYYY-MM-DD
  totalTokensIssued: number;
  completedTokens: number;
  cancelledTokens: number;
  noShowTokens: number;
  averageWaitMinutes: number;
  averageConsultationMinutes: number;
  totalAppointments: number;
  totalRevenue: number;
  totalWhatsAppSent: number;
}

export interface MonthlyReportDto {
  clinicId: string;
  clinicName: string;
  month: string; // YYYY-MM
  totalTokensIssued: number;
  completedTokens: number;
  cancelledTokens: number;
  totalAppointments: number;
  totalRevenue: number;
  activeDoctorsCount: number;
  busiestDay: string | null;
}

export interface HourlyTrafficDto {
  hour: number; // 0-23
  tokensCount: number;
}

export interface AdvancedAnalyticsDto {
  clinicId: string;
  clinicName: string;
  date: string;
  hourlyTraffic: HourlyTrafficDto[];
  peakHour: number;
  longestWaitMinutes: number;
  averageConsultationMinutes: number;
  completionRatePercent: number;
  noShowRatePercent: number;
}

export interface ExportReportQueryDto {
  format?: 'csv' | 'json';
  type?: 'daily' | 'monthly';
  date?: string;
}

