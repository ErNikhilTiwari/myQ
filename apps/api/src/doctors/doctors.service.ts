import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDoctorDto, UpdateDoctorDto } from '@queueapp/shared';

@Injectable()
export class DoctorsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all doctors for a clinic
   */
  async findByClinic(clinicId: string) {
    return this.prisma.doctor.findMany({
      where: { clinicId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Find doctor by ID strictly scoped to a clinic
   */
  async findOneScoped(clinicId: string, doctorId: string) {
    const doctor = await this.prisma.doctor.findFirst({
      where: { id: doctorId, clinicId },
    });

    if (!doctor) {
      throw new NotFoundException(
        `Doctor with ID "${doctorId}" not found in clinic "${clinicId}".`,
      );
    }

    return doctor;
  }

  /**
   * Create doctor for a clinic
   */
  async create(clinicId: string, dto: CreateDoctorDto) {
    return this.prisma.doctor.create({
      data: {
        clinicId,
        name: dto.name,
        specialization: dto.specialization,
        roomNumber: dto.roomNumber,
      },
    });
  }

  /**
   * Update doctor scoped to a clinic
   */
  async update(clinicId: string, doctorId: string, dto: UpdateDoctorDto) {
    // Assert existence in clinic
    await this.findOneScoped(clinicId, doctorId);

    return this.prisma.doctor.update({
      where: { id: doctorId },
      data: dto,
    });
  }

  /**
   * Delete / deactivate doctor scoped to a clinic
   */
  async remove(clinicId: string, doctorId: string) {
    await this.findOneScoped(clinicId, doctorId);

    return this.prisma.doctor.update({
      where: { id: doctorId },
      data: { isActive: false },
    });
  }
}
