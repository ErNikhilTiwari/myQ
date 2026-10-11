import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CreateDoctorDto,
  UpdateDoctorDto,
  UserRole,
  ApiResponse,
} from '@queueapp/shared';

@Controller('api/clinics/:clinicId/doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  async findAll(@Param('clinicId') clinicId: string): Promise<ApiResponse> {
    const data = await this.doctorsService.findByClinic(clinicId);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(
    @Param('clinicId') clinicId: string,
    @Param('id') id: string,
  ): Promise<ApiResponse> {
    const data = await this.doctorsService.findOneScoped(clinicId, id);
    return { success: true, data };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  async create(
    @Param('clinicId') clinicId: string,
    @Body() dto: CreateDoctorDto,
  ): Promise<ApiResponse> {
    const data = await this.doctorsService.create(clinicId, dto);
    return { success: true, data };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  async update(
    @Param('clinicId') clinicId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDoctorDto,
  ): Promise<ApiResponse> {
    const data = await this.doctorsService.update(clinicId, id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  async remove(
    @Param('clinicId') clinicId: string,
    @Param('id') id: string,
  ): Promise<ApiResponse> {
    const data = await this.doctorsService.remove(clinicId, id);
    return { success: true, data };
  }
}
