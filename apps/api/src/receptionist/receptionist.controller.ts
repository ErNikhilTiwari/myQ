import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReceptionistService } from './receptionist.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  WalkInRegistrationDto,
  UserRole,
  ApiResponse,
} from '@queueapp/shared';

@Controller('api/clinics/:clinicId/receptionist')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
export class ReceptionistController {
  constructor(private readonly receptionistService: ReceptionistService) {}

  /**
   * Register walk-in patient and issue token in chosen queue
   */
  @Post('walk-in')
  @HttpCode(HttpStatus.CREATED)
  async registerWalkIn(
    @Param('clinicId') clinicId: string,
    @Body() dto: WalkInRegistrationDto,
  ): Promise<ApiResponse> {
    const data = await this.receptionistService.registerWalkIn(clinicId, dto);
    return { success: true, data };
  }

  /**
   * Get daily summary statistics for Receptionist Dashboard
   */
  @Get('stats')
  async getDailyStats(
    @Param('clinicId') clinicId: string,
  ): Promise<ApiResponse> {
    const data = await this.receptionistService.getDailyStats(clinicId);
    return { success: true, data };
  }

  /**
   * Search existing patients
   */
  @Get('patients')
  async searchPatients(
    @Query('query') query: string,
  ): Promise<ApiResponse> {
    const data = await this.receptionistService.searchPatients(query);
    return { success: true, data };
  }
}
