import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClinicDto, UpdateClinicDto, UserRole } from '@queueapp/shared';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class ClinicsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Public clinic discovery / search
   */
  async findAll(search?: string) {
    const where: any = { isActive: true };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { address: { contains: search } },
        { slug: { contains: search } },
      ];
    }

    const clinics = await this.prisma.clinic.findMany({
      where,
      include: {
        _count: {
          select: {
            doctors: true,
            services: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return clinics.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      phoneNumber: c.phoneNumber,
      email: c.email,
      address: c.address,
      inClinicPrice: c.inClinicPrice ?? 200,
      remotePrice: c.remotePrice ?? 250,
      voiceAnnouncementMode: (c as any).voiceAnnouncementMode ?? 'TOKEN_PATIENT_DOCTOR_ROOM',
      isActive: c.isActive,
      createdAt: c.createdAt.toISOString(),
      doctorsCount: c._count.doctors,
      servicesCount: c._count.services,
    }));
  }

  /**
   * Public clinic profile with doctors, services, and queues
   */
  async findById(id: string) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id },
      include: {
        doctors: { where: { isActive: true } },
        services: { where: { isActive: true } },
        queues: true,
      },
    });

    if (!clinic) {
      throw new NotFoundException(`Clinic with ID "${id}" not found.`);
    }

    return clinic;
  }

  /**
   * Super Admin provisions a new clinic
   */
  async create(dto: CreateClinicDto) {
    const existing = await this.prisma.clinic.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException(`Clinic slug "${dto.slug}" already exists. Please choose another.`);
    }

    const clinic = await this.prisma.clinic.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        phoneNumber: dto.phoneNumber,
        email: dto.email,
        address: dto.address,
        city: dto.city,
        chainId: dto.chainId || null,
        inClinicPrice: dto.inClinicPrice !== undefined ? Number(dto.inClinicPrice) : 200,
        remotePrice: dto.remotePrice !== undefined ? Number(dto.remotePrice) : 250,
        voiceAnnouncementMode: dto.voiceAnnouncementMode || 'TOKEN_PATIENT_DOCTOR_ROOM',
      },
    });

    // Auto-provision Clinic Admin User account and link ClinicStaff
    if (dto.phoneNumber) {
      const cleanPhone = dto.phoneNumber.startsWith('+91')
        ? dto.phoneNumber
        : `+91${dto.phoneNumber.replace(/\D/g, '').slice(-10)}`;

      const defaultPasswordHash = await bcrypt.hash('Password@123', 10);

      let adminUser = await this.prisma.user.findFirst({
        where: {
          OR: [
            { phoneNumber: dto.phoneNumber },
            { phoneNumber: cleanPhone },
          ],
        },
      });

      if (!adminUser) {
        adminUser = await this.prisma.user.create({
          data: {
            phoneNumber: cleanPhone,
            name: `${dto.name} Admin`,
            email: dto.email || null,
            passwordHash: defaultPasswordHash,
            role: UserRole.CLINIC_ADMIN,
          },
        });
      } else if (adminUser.role === UserRole.PATIENT) {
        adminUser = await this.prisma.user.update({
          where: { id: adminUser.id },
          data: {
            role: UserRole.CLINIC_ADMIN,
            name: adminUser.name.startsWith('Patient ') ? `${dto.name} Admin` : adminUser.name,
          },
        });
      }

      await this.prisma.clinicStaff.upsert({
        where: {
          clinicId_userId: {
            clinicId: clinic.id,
            userId: adminUser.id,
          },
        },
        create: {
          clinicId: clinic.id,
          userId: adminUser.id,
          role: UserRole.CLINIC_ADMIN,
        },
        update: {
          role: UserRole.CLINIC_ADMIN,
        },
      });
    }

    return clinic;
  }

  /**
   * Hospital Chain Management (Phase 3 Multi-Location Enterprise)
   */
  async createChain(dto: { name: string; code: string; headquarters?: string }) {
    const existing = await this.prisma.hospitalChain.findUnique({
      where: { code: dto.code.toUpperCase() },
    });
    if (existing) {
      throw new ConflictException(`Hospital chain with code "${dto.code}" already exists.`);
    }

    return this.prisma.hospitalChain.create({
      data: {
        name: dto.name,
        code: dto.code.toUpperCase(),
        headquarters: dto.headquarters,
      },
    });
  }

  async getChains() {
    const chains = await this.prisma.hospitalChain.findMany({
      where: { isActive: true },
      include: {
        clinics: {
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            phoneNumber: true,
            address: true,
            isActive: true,
          },
        },
        _count: {
          select: { clinics: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return chains.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      headquarters: c.headquarters,
      isActive: c.isActive,
      createdAt: c.createdAt.toISOString(),
      clinicsCount: c._count.clinics,
      clinics: c.clinics,
    }));
  }

  async getChainById(id: string) {
    const chain = await this.prisma.hospitalChain.findUnique({
      where: { id },
      include: {
        clinics: {
          include: {
            _count: {
              select: {
                doctors: true,
                services: true,
                queues: true,
              },
            },
          },
        },
      },
    });

    if (!chain) {
      throw new NotFoundException(`Hospital chain with ID "${id}" not found.`);
    }

    return chain;
  }

  /**
   * Clinic Admin updates clinic information
   */
  async update(id: string, dto: UpdateClinicDto) {
    const clinic = await this.prisma.clinic.findUnique({ where: { id } });
    if (!clinic) {
      throw new NotFoundException(`Clinic with ID "${id}" not found.`);
    }

    return this.prisma.clinic.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Retrieve staff for a clinic (protected to that clinic's admin or super admin)
   */
  async getStaff(clinicId: string) {
    return this.prisma.clinicStaff.findMany({
      where: { clinicId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            role: true,
          },
        },
      },
    });
  }

  /**
   * Assign a user as clinic staff
   */
  async assignStaff(clinicId: string, userId: string, role: string) {
    return this.prisma.clinicStaff.upsert({
      where: {
        clinicId_userId: { clinicId, userId },
      },
      update: { role },
      create: { clinicId, userId, role },
    });
  }
}

