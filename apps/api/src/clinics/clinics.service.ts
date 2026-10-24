import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  CreateClinicDto, 
  UpdateClinicDto, 
  UserRole,
  RegisterReceptionistDto,
  UpdateReceptionistDto,
} from '@queueapp/shared';
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

    const rawDigits = dto.phoneNumber.replace(/\D/g, '').slice(-10);
    if (rawDigits.length !== 10 || !/^[6-9]\d{9}$/.test(rawDigits)) {
      throw new BadRequestException(
        'Invalid mobile number. Please provide a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9 (e.g. 9876543210).',
      );
    }
    const cleanPhone = `+91${rawDigits}`;

    const clinic = await this.prisma.clinic.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        phoneNumber: cleanPhone,
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
      const adminPasswordHash = await bcrypt.hash(dto.adminPassword?.trim() || 'Password@123', 10);

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
            passwordHash: adminPasswordHash,
            role: UserRole.CLINIC_ADMIN,
          },
        });
      } else if (adminUser.role === UserRole.PATIENT) {
        adminUser = await this.prisma.user.update({
          where: { id: adminUser.id },
          data: {
            role: UserRole.CLINIC_ADMIN,
            name: adminUser.name.startsWith('Patient ') ? `${dto.name} Admin` : adminUser.name,
            passwordHash: dto.adminPassword ? adminPasswordHash : (adminUser.passwordHash || adminPasswordHash),
          },
        });
      } else if (dto.adminPassword) {
        adminUser = await this.prisma.user.update({
          where: { id: adminUser.id },
          data: {
            passwordHash: adminPasswordHash,
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

    // Auto-provision Clinic Receptionist User account and link ClinicStaff if phone provided
    if (dto.receptionistPhoneNumber) {
      try {
        await this.registerReceptionist(clinic.id, {
          name: dto.receptionistName?.trim() || `${dto.name} Receptionist`,
          phoneNumber: dto.receptionistPhoneNumber,
          password: dto.receptionistPassword || 'Password@123',
        });
      } catch (err) {
        console.warn(`Could not auto-provision receptionist during clinic creation:`, err);
      }
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

    const dataToUpdate: any = { ...dto };

    if (dto.phoneNumber) {
      const rawDigits = dto.phoneNumber.replace(/\D/g, '').slice(-10);
      if (rawDigits.length !== 10 || !/^[6-9]\d{9}$/.test(rawDigits)) {
        throw new BadRequestException(
          'Invalid mobile number. Please provide a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.',
        );
      }
      dataToUpdate.phoneNumber = `+91${rawDigits}`;
    }

    return this.prisma.clinic.update({
      where: { id },
      data: dataToUpdate,
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

  /**
   * Receptionist Management (1 Receptionist Per Clinic Enforcement)
   */

  /**
   * Get the single receptionist assigned to a clinic
   */
  async getReceptionist(clinicId: string) {
    const staff = await this.prisma.clinicStaff.findFirst({
      where: {
        clinicId,
        role: UserRole.RECEPTIONIST,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    });

    if (!staff) return null;

    return {
      id: staff.id,
      clinicId: staff.clinicId,
      role: staff.role,
      createdAt: staff.createdAt.toISOString(),
      user: {
        id: staff.user.id,
        name: staff.user.name,
        phoneNumber: staff.user.phoneNumber,
        email: staff.user.email,
        role: staff.user.role,
        isActive: staff.user.isActive,
        createdAt: staff.user.createdAt.toISOString(),
      },
    };
  }

  /**
   * Register or assign the single receptionist for a clinic
   * Strictly enforces 1 receptionist per clinic.
   */
  async registerReceptionist(clinicId: string, dto: RegisterReceptionistDto) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
    });
    if (!clinic) {
      throw new NotFoundException(`Clinic with ID "${clinicId}" not found.`);
    }

    // Enforce 1 receptionist per clinic limit
    const existingStaff = await this.prisma.clinicStaff.findFirst({
      where: {
        clinicId,
        role: UserRole.RECEPTIONIST,
      },
      include: { user: true },
    });

    if (existingStaff) {
      throw new ConflictException(
        `This clinic already has a receptionist assigned (${existingStaff.user.name} - ${existingStaff.user.phoneNumber}). Each clinic is strictly limited to 1 receptionist. Please edit or remove the current receptionist first.`,
      );
    }

    const rawDigits = dto.phoneNumber.replace(/\D/g, '').slice(-10);
    if (rawDigits.length !== 10 || !/^[6-9]\d{9}$/.test(rawDigits)) {
      throw new BadRequestException(
        'Invalid mobile number. Please provide a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.',
      );
    }
    const cleanPhone = `+91${rawDigits}`;

    const passwordHash = await bcrypt.hash(dto.password || 'Password@123', 10);

    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phoneNumber: rawDigits },
          { phoneNumber: cleanPhone },
        ],
      },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phoneNumber: cleanPhone,
          name: dto.name.trim(),
          role: UserRole.RECEPTIONIST,
          passwordHash,
        },
      });
    } else {
      // If user already existed as PATIENT, promote to RECEPTIONIST
      if (user.role === UserRole.PATIENT) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            role: UserRole.RECEPTIONIST,
            name: dto.name.trim() || user.name,
            passwordHash: dto.password ? passwordHash : (user.passwordHash || passwordHash),
          },
        });
      } else if (dto.password) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            name: dto.name.trim() || user.name,
            passwordHash,
          },
        });
      }
    }

    const staff = await this.prisma.clinicStaff.create({
      data: {
        clinicId,
        userId: user.id,
        role: UserRole.RECEPTIONIST,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    });

    return {
      id: staff.id,
      clinicId: staff.clinicId,
      role: staff.role,
      createdAt: staff.createdAt.toISOString(),
      user: {
        id: staff.user.id,
        name: staff.user.name,
        phoneNumber: staff.user.phoneNumber,
        email: staff.user.email,
        role: staff.user.role,
        isActive: staff.user.isActive,
        createdAt: staff.user.createdAt.toISOString(),
      },
    };
  }

  /**
   * Update existing receptionist for a clinic
   */
  async updateReceptionist(clinicId: string, dto: UpdateReceptionistDto) {
    const staff = await this.prisma.clinicStaff.findFirst({
      where: {
        clinicId,
        role: UserRole.RECEPTIONIST,
      },
      include: { user: true },
    });

    if (!staff) {
      throw new NotFoundException('No receptionist found for this clinic to update.');
    }

    const updateData: any = {};
    if (dto.name) updateData.name = dto.name.trim();
    if (dto.password) updateData.passwordHash = await bcrypt.hash(dto.password, 10);
    if (typeof dto.isActive === 'boolean') updateData.isActive = dto.isActive;

    if (dto.phoneNumber) {
      const rawDigits = dto.phoneNumber.replace(/\D/g, '').slice(-10);
      if (rawDigits.length !== 10 || !/^[6-9]\d{9}$/.test(rawDigits)) {
        throw new BadRequestException(
          'Invalid mobile number. Please provide a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.',
        );
      }
      const cleanPhone = `+91${rawDigits}`;

      const phoneConflict = await this.prisma.user.findFirst({
        where: {
          phoneNumber: cleanPhone,
          id: { not: staff.userId },
        },
      });

      if (phoneConflict) {
        throw new ConflictException(`Phone number ${cleanPhone} is already in use by another user.`);
      }

      updateData.phoneNumber = cleanPhone;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: staff.userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return {
      id: staff.id,
      clinicId: staff.clinicId,
      role: staff.role,
      createdAt: staff.createdAt.toISOString(),
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        phoneNumber: updatedUser.phoneNumber,
        email: updatedUser.email,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        createdAt: updatedUser.createdAt.toISOString(),
      },
    };
  }

  /**
   * Remove receptionist from a clinic
   */
  async removeReceptionist(clinicId: string) {
    const staff = await this.prisma.clinicStaff.findFirst({
      where: {
        clinicId,
        role: UserRole.RECEPTIONIST,
      },
    });

    if (!staff) {
      throw new NotFoundException('No receptionist assigned to this clinic.');
    }

    await this.prisma.clinicStaff.delete({
      where: { id: staff.id },
    });

    // Check if user has any other active staff profiles
    const remainingStaff = await this.prisma.clinicStaff.findFirst({
      where: { userId: staff.userId },
    });

    if (!remainingStaff) {
      await this.prisma.user.update({
        where: { id: staff.userId },
        data: { role: UserRole.PATIENT },
      });
    }

    return { success: true, message: 'Receptionist removed successfully from clinic.' };
  }

  /**
   * Super Admin Overview: All clinics with their single receptionist
   */
  async getAllReceptionistsSummary() {
    const clinics = await this.prisma.clinic.findMany({
      include: {
        staff: {
          where: { role: UserRole.RECEPTIONIST },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phoneNumber: true,
                email: true,
                isActive: true,
                createdAt: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return clinics.map((c) => {
      const recStaff = c.staff[0];
      return {
        clinicId: c.id,
        clinicName: c.name,
        clinicSlug: c.slug,
        clinicPhone: c.phoneNumber,
        receptionist: recStaff
          ? {
              id: recStaff.id,
              userId: recStaff.user.id,
              name: recStaff.user.name,
              phoneNumber: recStaff.user.phoneNumber,
              email: recStaff.user.email,
              isActive: recStaff.user.isActive,
              createdAt: recStaff.createdAt.toISOString(),
            }
          : null,
      };
    });
  }
}

