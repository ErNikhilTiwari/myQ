import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Req,
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
  RegisterReceptionistDto,
  UpdateReceptionistDto,
  DeleteClinicForeverDto,
  UserRole,
  ApiResponse,
} from '@queueapp/shared';

@Controller('api')
export class ClinicsController {
  constructor(private readonly clinicsService: ClinicsService) {}

  @Get('clinics')
  async findAll(
    @Query('search') search?: string,
    @Query('all') all?: string,
  ): Promise<ApiResponse> {
    const data = await this.clinicsService.findAll(search, all === 'true');
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

  /**
   * Receptionist Management (1 Receptionist Per Clinic Limit)
   */
  @Get('clinics/:clinicId/receptionist')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  async getReceptionist(@Param('clinicId') clinicId: string): Promise<ApiResponse> {
    const data = await this.clinicsService.getReceptionist(clinicId);
    return { success: true, data };
  }

  @Post('clinics/:clinicId/receptionist')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async registerReceptionist(
    @Param('clinicId') clinicId: string,
    @Body() dto: RegisterReceptionistDto,
  ): Promise<ApiResponse> {
    const data = await this.clinicsService.registerReceptionist(clinicId, dto);
    return { success: true, data };
  }

  @Patch('clinics/:clinicId/receptionist')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async updateReceptionist(
    @Param('clinicId') clinicId: string,
    @Body() dto: UpdateReceptionistDto,
  ): Promise<ApiResponse> {
    const data = await this.clinicsService.updateReceptionist(clinicId, dto);
    return { success: true, data };
  }

  @Delete('clinics/:clinicId/receptionist')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async removeReceptionist(
    @Param('clinicId') clinicId: string,
  ): Promise<ApiResponse> {
    const data = await this.clinicsService.removeReceptionist(clinicId);
    return { success: true, data };
  }

  @Get('super/receptionists')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async getSuperReceptionists(): Promise<ApiResponse> {
    const data = await this.clinicsService.getAllReceptionistsSummary();
    return { success: true, data };
  }

  @Post('super/clinics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async createSuper(@Body() dto: CreateClinicDto): Promise<ApiResponse> {
    const data = await this.clinicsService.create(dto);
    return { success: true, data };
  }

  @Get('super/clinics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async getSuperClinics(): Promise<ApiResponse> {
    const data = await this.clinicsService.getAllSuperClinics();
    return { success: true, data };
  }

  @Post('super/clinics/:clinicId/suspend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async suspendClinic(
    @Param('clinicId') clinicId: string,
    @Req() req: any,
  ): Promise<ApiResponse> {
    const data = await this.clinicsService.suspendClinicMembership(clinicId, req.user.id);
    return { success: true, data };
  }

  @Post('super/clinics/:clinicId/reactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async reactivateClinic(
    @Param('clinicId') clinicId: string,
    @Req() req: any,
  ): Promise<ApiResponse> {
    const data = await this.clinicsService.reactivateClinicMembership(clinicId, req.user.id);
    return { success: true, data };
  }

  @Delete('super/clinics/:clinicId/permanent')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async deleteClinicPermanently(
    @Param('clinicId') clinicId: string,
    @Req() req: any,
    @Body() dto: DeleteClinicForeverDto,
  ): Promise<ApiResponse> {
    const data = await this.clinicsService.permanentlyDeleteClinic(clinicId, req.user.id, dto);
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

