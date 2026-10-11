export interface PushSubscriptionDto {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
}

export interface SendPushNotificationDto {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}
