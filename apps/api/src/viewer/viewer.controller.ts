import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ViewerService } from './viewer.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CreateDisplayDeviceDto,
  UserRole,
  ApiResponse,
} from '@queueapp/shared';

@Controller('api')
export class ViewerController {
  constructor(private readonly viewerService: ViewerService) {}

  /**
   * 1. Public TV Snapshot (Zero Auth Required — used by Smart TVs)
   */
  @Get('viewer/:displayToken/snapshot')
  async getSnapshot(
    @Param('displayToken') displayToken: string,
  ): Promise<ApiResponse> {
    const data = await this.viewerService.getSnapshot(displayToken);
    return { success: true, data };
  }

  /**
   * 2. TV Heartbeat Ping (Zero Auth Required)
   */
  @Post('viewer/:displayToken/heartbeat')
  @HttpCode(HttpStatus.OK)
  async recordHeartbeat(
    @Param('displayToken') displayToken: string,
  ): Promise<ApiResponse> {
    const data = await this.viewerService.recordHeartbeat(displayToken);
    return { success: true, data };
  }

  /**
   * 3. Clinic Admin registers new TV device
   */
  @Post('clinics/:clinicId/displays')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async createDevice(
    @Param('clinicId') clinicId: string,
    @Body() dto: CreateDisplayDeviceDto,
  ): Promise<ApiResponse> {
    const data = await this.viewerService.createDevice(clinicId, dto);
    return { success: true, data };
  }

  /**
   * 4. List configured TV displays for clinic
   */
  @Get('clinics/:clinicId/displays')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  async listDevices(
    @Param('clinicId') clinicId: string,
  ): Promise<ApiResponse> {
    const data = await this.viewerService.listDevices(clinicId);
    return { success: true, data };
  }
}
