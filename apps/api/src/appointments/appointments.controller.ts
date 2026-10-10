import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  BookAppointmentDto,
  RescheduleAppointmentDto,
  UserRole,
  ApiResponse,
} from '@queueapp/shared';

@Controller('api')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  /**
   * 1. Book an appointment (Patient)
   */
  @Post('appointments')
  @UseGuards(JwtAuthGuard)
  async book(
    @CurrentUser('id') userId: string,
    @Body() dto: BookAppointmentDto,
  ): Promise<ApiResponse> {
    const data = await this.appointmentsService.bookAppointment(userId, dto);
    return { success: true, data };
  }

  /**
   * 2. Get appointment details (Owner or Staff)
   */
  @Get('appointments/:id')
  @UseGuards(JwtAuthGuard)
  async getOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<ApiResponse> {
    const data = await this.appointmentsService.getAppointment(
      id,
      user.id,
      user.role,
      user.clinicId,
    );
    return { success: true, data };
  }

  /**
   * 3. Reschedule appointment
   */
  @Post('appointments/:id/reschedule')
  @UseGuards(JwtAuthGuard)
  async reschedule(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: RescheduleAppointmentDto,
  ): Promise<ApiResponse> {
    const data = await this.appointmentsService.rescheduleAppointment(
      id,
      user.id,
      user.role,
      dto,
      user.clinicId,
    );
    return { success: true, data };
  }

  /**
   * 4. Cancel appointment
   */
  @Post('appointments/:id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<ApiResponse> {
    const data = await this.appointmentsService.cancelAppointment(
      id,
      user.id,
      user.role,
      user.clinicId,
    );
    return { success: true, data };
  }

  /**
   * 5. Confirm Arrival: convert appointment into active queue token (Clinic Staff)
   */
  @Post('clinics/:clinicId/appointments/:id/confirm-arrival')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  async confirmArrival(
    @Param('clinicId') clinicId: string,
    @Param('id') id: string,
  ): Promise<ApiResponse> {
    const data = await this.appointmentsService.confirmArrival(clinicId, id);
    return { success: true, data };
  }

  /**
   * 6. List clinic appointments (Staff)
   */
  @Get('clinics/:clinicId/appointments')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  async listClinicAppointments(
    @Param('clinicId') clinicId: string,
    @Query('status') status?: string,
  ): Promise<ApiResponse> {
    const data = await this.appointmentsService.listClinicAppointments(clinicId, status);
    return { success: true, data };
  }
}
