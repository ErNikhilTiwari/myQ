import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  UpgradeSubscriptionDto,
  RenewSubscriptionDto,
  ExtendSubscriptionDto,
  UserRole,
  ApiResponse,
} from '@queueapp/shared';

@Controller('api')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  /**
   * 1. Clinic Admin: Get clinic subscription details, quota limits, usage and invoices
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
   * 2. Clinic Admin: Renew or upgrade membership plan with Monthly, Quarterly, or Yearly billing
   */
  @Post('clinics/:clinicId/subscription/renew')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  async renew(
    @Param('clinicId') clinicId: string,
    @Body() dto: RenewSubscriptionDto,
  ): Promise<ApiResponse> {
    const data = await this.subscriptionsService.renewOrUpgradeSubscription(clinicId, dto);
    return { success: true, data };
  }

  /**
   * 3. Clinic Admin: Legacy upgrade route
   */
  @Post('clinics/:clinicId/subscription/upgrade')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  async upgrade(
    @Param('clinicId') clinicId: string,
    @Body() dto: UpgradeSubscriptionDto,
  ): Promise<ApiResponse> {
    const data = await this.subscriptionsService.renewOrUpgradeSubscription(clinicId, dto);
    return { success: true, data };
  }

  /**
   * 4. Clinic Admin: Get billing invoices history
   */
  @Get('clinics/:clinicId/subscription/invoices')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  async getInvoices(
    @Param('clinicId') clinicId: string,
  ): Promise<ApiResponse> {
    const data = await this.subscriptionsService.getClinicInvoices(clinicId);
    return { success: true, data };
  }

  /**
   * 5. Super Admin: List all clinic subscriptions across platform
   */
  @Get('super/subscriptions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async listAll(): Promise<ApiResponse> {
    const data = await this.subscriptionsService.listAllSubscriptions();
    return { success: true, data };
  }

  /**
   * 6. Super Admin: Extend clinic subscription validity (Manual Trial/Grace Days grant)
   */
  @Post('super/subscriptions/:clinicId/extend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async superExtend(
    @Param('clinicId') clinicId: string,
    @Body() dto: ExtendSubscriptionDto,
    @Req() req: any,
  ): Promise<ApiResponse> {
    const data = await this.subscriptionsService.superExtendSubscription(
      clinicId,
      dto,
      req.user.id,
    );
    return { success: true, data };
  }
}
