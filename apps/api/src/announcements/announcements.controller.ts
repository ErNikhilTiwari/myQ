import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
  UserRole,
  ApiResponse,
} from '@queueapp/shared';

@Controller('api/clinics/:clinicId/announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  /**
   * 1. Public Active Announcements for TV & Patient Pages (Zero Auth)
   */
  @Get('active')
  async getActive(
    @Param('clinicId') clinicId: string,
    @Query('displayDeviceId') displayDeviceId?: string,
    @Query('queueId') queueId?: string,
  ): Promise<ApiResponse> {
    const data = await this.announcementsService.getActiveAnnouncements(
      clinicId,
      displayDeviceId,
      queueId,
    );
    return { success: true, data };
  }

  /**
   * 2. Dual Voice Callout Generator (English + Hindi)
   */
  @Get('callout-voice')
  async getCalloutVoice(
    @Query('tokenNumber') tokenNumber: string,
    @Query('roomNumber') roomNumber?: string,
    @Query('doctorName') doctorName?: string,
  ): Promise<ApiResponse> {
    const data = this.announcementsService.generateVoiceCallout(
      tokenNumber,
      roomNumber,
      doctorName,
    );
    return { success: true, data };
  }

  /**
   * 3. Staff creates announcement (Doctor delay, Closure, Health Tip)
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  async create(
    @Param('clinicId') clinicId: string,
    @Body() dto: CreateAnnouncementDto,
  ): Promise<ApiResponse> {
    const data = await this.announcementsService.createAnnouncement(clinicId, dto);
    return { success: true, data };
  }

  /**
   * 4. Staff lists clinic announcements
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  async list(
    @Param('clinicId') clinicId: string,
  ): Promise<ApiResponse> {
    const data = await this.announcementsService.listAnnouncements(clinicId);
    return { success: true, data };
  }

  /**
   * 5. Emergency Full-Screen Takeover Trigger
   */
  @Post('emergency')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  async emergencyTakeover(
    @Param('clinicId') clinicId: string,
    @Body('title') title: string,
    @Body('messageEn') messageEn: string,
    @Body('messageHi') messageHi?: string,
  ): Promise<ApiResponse> {
    const data = await this.announcementsService.createEmergencyTakeover(
      clinicId,
      title,
      messageEn,
      messageHi,
    );
    return { success: true, data };
  }

  /**
   * 6. Update announcement
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  async update(
    @Param('clinicId') clinicId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAnnouncementDto,
  ): Promise<ApiResponse> {
    const data = await this.announcementsService.updateAnnouncement(clinicId, id, dto);
    return { success: true, data };
  }

  /**
   * 7. Archive announcement
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  async archive(
    @Param('clinicId') clinicId: string,
    @Param('id') id: string,
  ): Promise<ApiResponse> {
    const data = await this.announcementsService.archiveAnnouncement(clinicId, id);
    return { success: true, data };
  }
}
