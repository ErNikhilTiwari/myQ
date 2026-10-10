import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { QueuesService } from './queues.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CreateQueueDto,
  IssueTokenDto,
  QueueTransitionDto,
  UserRole,
  ApiResponse,
} from '@queueapp/shared';

@Controller('api')
export class QueuesController {
  constructor(private readonly queuesService: QueuesService) {}

  /**
   * 1. Public QR Token Lookup (Zero Auth Required)
   */
  @Get('queue/:publicToken')
  async getPublicTokenStatus(
    @Param('publicToken') publicToken: string,
  ): Promise<ApiResponse> {
    const data = await this.queuesService.getPublicTokenStatus(publicToken);
    return { success: true, data };
  }

  /**
   * 2. List queues for clinic (Public / Staff)
   */
  @Get('clinics/:clinicId/queues')
  async getClinicQueues(@Param('clinicId') clinicId: string): Promise<ApiResponse> {
    const data = await this.queuesService.getClinicQueues(clinicId);
    return { success: true, data };
  }

  /**
   * 3. Get detailed queue state for Receptionist Dashboard
   */
  @Get('clinics/:clinicId/queues/:queueId')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR)
  async getQueueDetails(
    @Param('clinicId') clinicId: string,
    @Param('queueId') queueId: string,
  ): Promise<ApiResponse> {
    const data = await this.queuesService.getQueueDetails(clinicId, queueId);
    return { success: true, data };
  }

  /**
   * 4. Create Queue (Clinic Admin)
   */
  @Post('clinics/:clinicId/queues')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async createQueue(
    @Param('clinicId') clinicId: string,
    @Body() dto: CreateQueueDto,
  ): Promise<ApiResponse> {
    const data = await this.queuesService.createQueue(clinicId, dto);
    return { success: true, data };
  }

  /**
   * 5. Issue Token (Receptionist / Patient)
   */
  @Post('clinics/:clinicId/queues/:queueId/issue-token')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST, UserRole.PATIENT)
  async issueToken(
    @Param('clinicId') clinicId: string,
    @Param('queueId') queueId: string,
    @Body() dto: IssueTokenDto,
  ): Promise<ApiResponse> {
    const data = await this.queuesService.issueToken(clinicId, queueId, dto);
    return { success: true, data };
  }

  /**
   * 6. Concurrency-Safe Call Next (Receptionist)
   */
  @Post('clinics/:clinicId/queues/:queueId/call-next')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  async callNext(
    @Param('clinicId') clinicId: string,
    @Param('queueId') queueId: string,
  ): Promise<ApiResponse> {
    const data = await this.queuesService.callNext(clinicId, queueId);
    return { success: true, data };
  }

  /**
   * 7. Transition Token State (Skip, Hold, Complete, Cancel, Recall)
   */
  @Post('clinics/:clinicId/queues/entries/:entryId/transition')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  async transitionEntry(
    @Param('clinicId') clinicId: string,
    @Param('entryId') entryId: string,
    @Body() dto: QueueTransitionDto,
  ): Promise<ApiResponse> {
    const data = await this.queuesService.transitionEntry(clinicId, entryId, dto);
    return { success: true, data };
  }

  /**
   * 8. Pause / Resume Queue
   */
  @Patch('clinics/:clinicId/queues/:queueId/pause')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  async togglePause(
    @Param('clinicId') clinicId: string,
    @Param('queueId') queueId: string,
    @Body('isPaused') isPaused: boolean,
  ): Promise<ApiResponse> {
    const data = await this.queuesService.toggleQueuePause(clinicId, queueId, isPaused);
    return { success: true, data };
  }
}
