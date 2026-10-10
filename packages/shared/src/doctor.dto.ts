export interface DoctorDto {
  id: string;
  clinicId: string;
  name: string;
  specialization: string;
  roomNumber?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateDoctorDto {
  name: string;
  specialization: string;
  roomNumber?: string;
}

export interface UpdateDoctorDto {
  name?: string;
  specialization?: string;
  roomNumber?: string;
  isActive?: boolean;
}
