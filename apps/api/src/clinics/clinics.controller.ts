import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ClinicsService } from './clinics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CreateClinicDto,
  UpdateClinicDto,
  UserRole,
  ApiResponse,
} from '@queueapp/shared';

@Controller('api')
export class ClinicsController {
  constructor(private readonly clinicsService: ClinicsService) {}

  @Get('clinics')
  async findAll(@Query('search') search?: string): Promise<ApiResponse> {
    const data = await this.clinicsService.findAll(search);
    return { success: true, data };
  }

  @Get('clinics/:id')
  async findById(@Param('id') id: string): Promise<ApiResponse> {
    const data = await this.clinicsService.findById(id);
    return { success: true, data };
  }

  @Patch('clinics/:clinicId')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  async update(
    @Param('clinicId') clinicId: string,
    @Body() dto: UpdateClinicDto,
  ): Promise<ApiResponse> {
    const data = await this.clinicsService.update(clinicId, dto);
    return { success: true, data };
  }

  @Get('clinics/:clinicId/staff')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  async getStaff(@Param('clinicId') clinicId: string): Promise<ApiResponse> {
    const data = await this.clinicsService.getStaff(clinicId);
    return { success: true, data };
  }

  @Post('super/clinics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async createSuper(@Body() dto: CreateClinicDto): Promise<ApiResponse> {
    const data = await this.clinicsService.create(dto);
    return { success: true, data };
  }

  /**
   * Hospital Chains (Phase 3 Multi-Location Enterprise)
   */
  @Get('hospital-chains')
  async getChains(): Promise<ApiResponse> {
    const data = await this.clinicsService.getChains();
    return { success: true, data };
  }

  @Get('hospital-chains/:id')
  async getChainById(@Param('id') id: string): Promise<ApiResponse> {
    const data = await this.clinicsService.getChainById(id);
    return { success: true, data };
  }

  @Post('super/hospital-chains')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async createChain(
    @Body() dto: { name: string; code: string; headquarters?: string },
  ): Promise<ApiResponse> {
    const data = await this.clinicsService.createChain(dto);
    return { success: true, data };
  }
}

