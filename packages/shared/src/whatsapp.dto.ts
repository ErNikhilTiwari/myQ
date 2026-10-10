export type WhatsAppDirection = 'INBOUND' | 'OUTBOUND';

export type WhatsAppMessageType = 'TEXT' | 'TEMPLATE' | 'INTERACTIVE';

export type WhatsAppMessageStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

export interface SendWhatsAppTemplateDto {
  clinicId: string;
  recipientPhone: string;
  templateName: string;
  parameters: Record<string, string>;
}

export interface SendWhatsAppMessageDto {
  clinicId: string;
  recipientPhone: string;
  messageText: string;
}

export interface WhatsAppMessageDto {
  id: string;
  clinicId: string;
  userId?: string | null;
  phoneNumber: string;
  direction: WhatsAppDirection;
  messageType: WhatsAppMessageType;
  content: string; // Text or JSON string
  gatewayMessageId?: string | null;
  status: WhatsAppMessageStatus;
  createdAt: string;
}

export interface WhatsAppWebhookVerificationQuery {
  'hub.mode'?: string;
  'hub.challenge'?: string;
  'hub.verify_token'?: string;
}

export interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: { name: string };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          text?: { body: string };
          type: string;
        }>;
        statuses?: Array<{
          id: string;
          status: string;
          timestamp: string;
          recipient_id: string;
        }>;
      };
      field: string;
    }>;
  }>;
}
