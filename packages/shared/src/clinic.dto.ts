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
}

export interface UpdateClinicDto {
  chainId?: string | null;
  name?: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  city?: string;
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

