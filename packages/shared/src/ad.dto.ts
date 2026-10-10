export type AdPlacement = 'TV_VIEWER_BOTTOM' | 'PATIENT_MOBILE_TOP' | 'PATIENT_MOBILE_BOTTOM';

export interface CreateAdDto {
  title: string;
  imageUrl: string;
  targetUrl?: string;
  placement: AdPlacement;
  clinicId?: string;
}

export interface AdDto {
  id: string;
  title: string;
  imageUrl: string;
  targetUrl?: string | null;
  placement: AdPlacement;
  clinicId?: string | null;
  isActive: boolean;
  impressionsCount: number;
  clicksCount: number;
  createdAt: string;
}

export interface RecordAdImpressionDto {
  deviceType?: 'TV' | 'MOBILE';
  clinicId?: string;
}

export interface RecordAdClickDto {
  deviceType?: 'TV' | 'MOBILE';
  clinicId?: string;
}
