export interface ClinicDto {
  id: string;
  name: string;
  slug: string;
  phoneNumber: string;
  email?: string | null;
  address?: string | null;
  isActive: boolean;
  createdAt: string;
  doctorsCount?: number;
  servicesCount?: number;
}

export interface CreateClinicDto {
  name: string;
  slug: string;
  phoneNumber: string;
  email?: string;
  address?: string;
}

export interface UpdateClinicDto {
  name?: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  isActive?: boolean;
}
