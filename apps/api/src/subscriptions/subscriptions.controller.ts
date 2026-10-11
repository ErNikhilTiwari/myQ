import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  UpgradeSubscriptionDto,
  UserRole,
  ApiResponse,
} from '@queueapp/shared';

@Controller('api')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  /**
   * 1. Clinic Admin: Get clinic subscription details and limits
   */
  @Get('clinics/:clinicId/subscription')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  async getSubscription(
    @Param('clinicId') clinicId: string,
  ): Promise<ApiResponse> {
    const data = await this.subscriptionsService.getClinicSubscription(clinicId);
    return { success: true, data };
  }

  /**
   * 2. Clinic Admin: Upgrade clinic subscription plan
   */
  @Post('clinics/:clinicId/subscription/upgrade')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  async upgrade(
    @Param('clinicId') clinicId: string,
    @Body() dto: UpgradeSubscriptionDto,
  ): Promise<ApiResponse> {
    const data = await this.subscriptionsService.upgradeSubscription(clinicId, dto);
    return { success: true, data };
  }

  /**
   * 3. Super Admin: List all clinic subscriptions across platform
   */
  @Get('super/subscriptions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async listAll(): Promise<ApiResponse> {
    const data = await this.subscriptionsService.listAllSubscriptions();
    return { success: true, data };
  }
}
