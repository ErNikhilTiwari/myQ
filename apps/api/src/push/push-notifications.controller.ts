import {
  Controller,
  Post,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PushNotificationsService } from './push-notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  PushSubscriptionDto,
  SendPushNotificationDto,
  UserRole,
  ApiResponse,
} from '@queueapp/shared';

@Controller('api')
export class PushNotificationsController {
  constructor(
    private readonly pushService: PushNotificationsService,
  ) {}

  /**
   * 1. Register Web Push Subscription (Authenticated User)
   */
  @Post('push/subscribe')
  @UseGuards(JwtAuthGuard)
  async subscribe(
    @CurrentUser('id') userId: string,
    @Body() dto: PushSubscriptionDto,
  ): Promise<ApiResponse> {
    const data = await this.pushService.registerSubscription(userId, dto);
    return { success: true, data };
  }

  /**
   * 2. Send Push Notification (Staff/Admin)
   */
  @Post('push/send')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  async send(
    @Body() dto: SendPushNotificationDto,
  ): Promise<ApiResponse> {
    const data = await this.pushService.sendNotification(dto);
    return { success: true, data };
  }

  /**
   * 3. Unsubscribe Web Push Subscription
   */
  @Delete('push/unsubscribe')
  @HttpCode(HttpStatus.OK)
  async unsubscribe(
    @Body('endpoint') endpoint: string,
  ): Promise<ApiResponse> {
    await this.pushService.unsubscribe(endpoint);
    return { success: true, data: { unsubscribed: true } };
  }
}

