import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto, UpdateServiceDto } from '@queueapp/shared';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all services for a clinic
   */
  async findByClinic(clinicId: string) {
    return this.prisma.service.findMany({
      where: { clinicId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Find service scoped to clinic
   */
  async findOneScoped(clinicId: string, serviceId: string) {
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, clinicId },
    });

    if (!service) {
      throw new NotFoundException(
        `Service with ID "${serviceId}" not found in clinic "${clinicId}".`,
      );
    }

    return service;
  }

  /**
   * Create service for a clinic
   */
  async create(clinicId: string, dto: CreateServiceDto) {
    return this.prisma.service.create({
      data: {
        clinicId,
        name: dto.name,
        description: dto.description,
        durationMinutes: dto.durationMinutes,
        priceAmount: dto.priceAmount,
      },
    });
  }

  /**
   * Update service scoped to a clinic
   */
  async update(clinicId: string, serviceId: string, dto: UpdateServiceDto) {
    await this.findOneScoped(clinicId, serviceId);

    return this.prisma.service.update({
      where: { id: serviceId },
      data: dto,
    });
  }

  /**
   * Delete / deactivate service scoped to a clinic
   */
  async remove(clinicId: string, serviceId: string) {
    await this.findOneScoped(clinicId, serviceId);

    return this.prisma.service.update({
      where: { id: serviceId },
      data: { isActive: false },
    });
  }
}
