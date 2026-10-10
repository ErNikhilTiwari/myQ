export interface ServiceDto {
  id: string;
  clinicId: string;
  name: string;
  description?: string | null;
  durationMinutes: number;
  priceAmount: number;
  isActive: boolean;
  createdAt: string;
}

export interface CreateServiceDto {
  name: string;
  description?: string;
  durationMinutes: number;
  priceAmount: number;
}

export interface UpdateServiceDto {
  name?: string;
  description?: string;
  durationMinutes?: number;
  priceAmount?: number;
  isActive?: boolean;
}
