export type VoiceAnnouncementMode = 
  | 'TOKEN_ONLY' 
  | 'TOKEN_PATIENT' 
  | 'TOKEN_PATIENT_DOCTOR' 
  | 'TOKEN_PATIENT_DOCTOR_ROOM';

export interface ClinicDto {
  id: string;
  chainId?: string | null;
  chainName?: string | null;
  name: string;
  slug: string;
  phoneNumber: string;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  inClinicPrice: number;
  remotePrice: number;
  voiceAnnouncementMode?: VoiceAnnouncementMode;
  isActive: boolean;
  createdAt: string;
  doctorsCount?: number;
  servicesCount?: number;
}

export interface CreateClinicDto {
  chainId?: string;
  name: string;
  slug: string;
  phoneNumber: string;
  email?: string;
  address?: string;
  city?: string;
  inClinicPrice?: number;
  remotePrice?: number;
  voiceAnnouncementMode?: VoiceAnnouncementMode;
}

export interface UpdateClinicDto {
  chainId?: string | null;
  name?: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  city?: string;
  inClinicPrice?: number;
  remotePrice?: number;
  voiceAnnouncementMode?: VoiceAnnouncementMode;
  isActive?: boolean;
}

export interface HospitalChainDto {
  id: string;
  name: string;
  code: string;
  headquarters?: string | null;
  isActive: boolean;
  createdAt: string;
  clinicsCount?: number;
  clinics?: ClinicDto[];
}

export interface CreateHospitalChainDto {
  name: string;
  code: string;
  headquarters?: string;
}

