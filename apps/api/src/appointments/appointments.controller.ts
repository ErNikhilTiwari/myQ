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
   * 0. Get Rotating In-Clinic Secure Booking QR Code (Public for Clinic TV Display)
   */
  @Get('clinics/:clinicId/in-clinic-qr')
  async getInClinicQr(
    @Param('clinicId') clinicId: string,
  ): Promise<ApiResponse> {
    const data = await this.appointmentsService.generateInClinicQrCode(clinicId);
    return { success: true, data };
  }

  /**
   * 0b. Get Booked Slots for a clinic, doctor, and date (Public/Patient)
   */
  @Get('appointments/booked-slots')
  async getBookedSlots(
    @Query('clinicId') clinicId: string,
    @Query('doctorId') doctorId?: string,
    @Query('date') date?: string,
  ): Promise<ApiResponse> {
    const data = await this.appointmentsService.getBookedSlots(clinicId, doctorId, date);
    return { success: true, data };
  }

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
   * 1b. Get authenticated patient's appointments
   */
  @Get('appointments/my')
  @UseGuards(JwtAuthGuard)
  async getMyAppointments(
    @CurrentUser('id') userId: string,
  ): Promise<ApiResponse> {
    const data = await this.appointmentsService.getMyPatientAppointments(userId);
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

  /**
   * 7. Join Live Queue on Appointment Date (Patient Upgrade from Home)
   */
  @Post('appointments/:id/join-live-queue')
  @UseGuards(JwtAuthGuard)
  async joinLiveQueue(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<ApiResponse> {
    const data = await this.appointmentsService.joinLiveQueue(id, userId);
    return { success: true, data };
  }

  /**
   * 8. Dispatch Today's Appointment Reminders (Clinic Staff / Cron)
   */
  @Post('clinics/:clinicId/appointments/send-today-reminders')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  async sendTodayReminders(
    @Param('clinicId') clinicId: string,
  ): Promise<ApiResponse> {
    const data = await this.appointmentsService.sendTodayClinicReminders(clinicId);
    return { success: true, data };
  }
}

