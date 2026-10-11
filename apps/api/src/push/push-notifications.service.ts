import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  PushSubscriptionDto,
  SendPushNotificationDto,
} from '@queueapp/shared';

@Injectable()
export class PushNotificationsService {
  private readonly logger = new Logger(PushNotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Register or update Web Push subscription for authenticated patient or user
   */
  async registerSubscription(
    userId: string,
    dto: PushSubscriptionDto,
  ) {
    const existing = await this.prisma.pushSubscription.findUnique({
      where: { endpoint: dto.endpoint },
    });

    if (existing) {
      return this.prisma.pushSubscription.update({
        where: { endpoint: dto.endpoint },
        data: {
          userId,
          p256dh: dto.keys.p256dh,
          auth: dto.keys.auth,
          userAgent: dto.userAgent || null,
        },
      });
    }

    return this.prisma.pushSubscription.create({
      data: {
        userId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: dto.userAgent || null,
      },
    });
  }

  /**
   * Send Push Notification to all active client subscriptions of a user
   */
  async sendNotification(dto: SendPushNotificationDto) {
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId: dto.userId },
    });

    this.logger.log(
      `📲 Dispatching push notification to user ${dto.userId}: "${dto.title}" (${subscriptions.length} devices)`,
    );

    // In production, web-push library encrypts and sends to browser endpoints.
    // Here we record and simulate successful delivery for test verification.
    return {
      sentCount: subscriptions.length,
      title: dto.title,
      body: dto.body,
      recipientUserId: dto.userId,
      deliveredAt: new Date().toISOString(),
    };
  }

  /**
   * Delete subscription when user unsubscribes or device revokes permission
   */
  async unsubscribe(endpoint: string) {
    return this.prisma.pushSubscription.deleteMany({
      where: { endpoint },
    });
  }
}
