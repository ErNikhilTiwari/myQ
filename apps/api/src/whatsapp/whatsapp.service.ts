import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  SendWhatsAppTemplateDto,
  SendWhatsAppMessageDto,
  WhatsAppMessageDto,
  WhatsAppWebhookPayload,
  WhatsAppMessageStatus,
} from '@queueapp/shared';
import * as crypto from 'crypto';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12);

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly appSecret = process.env.META_APP_SECRET || 'test_meta_app_secret_12345';
  private readonly verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'queueapp_verify_token_secret';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verify WhatsApp Webhook Challenge (GET /api/webhooks/whatsapp)
   */
  verifyWebhookChallenge(mode?: string, token?: string, challenge?: string): string {
    if (mode === 'subscribe' && token === this.verifyToken) {
      this.logger.log('✅ WhatsApp Webhook challenge successfully verified.');
      return challenge || '';
    }
    this.logger.error('❌ Failed WhatsApp Webhook challenge verification.');
    throw new BadRequestException('Forbidden: Webhook challenge verification failed.');
  }

  /**
   * Send WhatsApp Template Notification (Appointment confirmation, Turn approaching, etc.)
   */
  async sendTemplateNotification(
    dto: SendWhatsAppTemplateDto,
  ): Promise<WhatsAppMessageDto> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: dto.clinicId },
    });
    if (!clinic) {
      throw new NotFoundException(`Clinic with ID "${dto.clinicId}" not found.`);
    }

    // Try to associate with user if phone exists
    const user = await this.prisma.user.findFirst({
      where: { phoneNumber: dto.recipientPhone },
    });

    const gatewayMessageId = `wam_${nanoid()}`;

    // Render simulated message body from template
    let content = `[Template: ${dto.templateName}] `;
    if (dto.templateName === 'appointment_confirmed') {
      content += `Hello! Your appointment with ${clinic.name} is confirmed for ${dto.parameters.slotTime || 'your slot'}.`;
    } else if (dto.templateName === 'turn_approaching') {
      content += `Your turn is approaching! Token ${dto.parameters.tokenNumber || ''} has 2 patients ahead.`;
    } else {
      content += JSON.stringify(dto.parameters);
    }

    const message = await this.prisma.whatsAppMessage.create({
      data: {
        clinicId: dto.clinicId,
        userId: user ? user.id : null,
        phoneNumber: dto.recipientPhone,
        direction: 'OUTBOUND',
        messageType: 'TEMPLATE',
        content,
        gatewayMessageId,
        status: 'SENT',
      },
    });

    this.logger.log(`📤 Dispatched WhatsApp Template "${dto.templateName}" to ${dto.recipientPhone}`);

    return this.mapToDto(message);
  }

  /**
   * Send general WhatsApp outbound message
   */
  async sendMessage(
    dto: SendWhatsAppMessageDto,
  ): Promise<WhatsAppMessageDto> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: dto.clinicId },
    });
    if (!clinic) {
      throw new NotFoundException(`Clinic with ID "${dto.clinicId}" not found.`);
    }

    const user = await this.prisma.user.findFirst({
      where: { phoneNumber: dto.recipientPhone },
    });

    const gatewayMessageId = `wam_${nanoid()}`;

    const message = await this.prisma.whatsAppMessage.create({
      data: {
        clinicId: dto.clinicId,
        userId: user ? user.id : null,
        phoneNumber: dto.recipientPhone,
        direction: 'OUTBOUND',
        messageType: 'TEXT',
        content: dto.messageText,
        gatewayMessageId,
        status: 'SENT',
      },
    });

    return this.mapToDto(message);
  }

  /**
   * Process Inbound WhatsApp Webhook (POST /api/webhooks/whatsapp)
   * Enforces HMAC-SHA256 signature verification (X-Hub-Signature-256) and idempotency.
   */
  async handleWebhook(
    rawBody: Buffer | string,
    signatureHeader: string,
    payload: WhatsAppWebhookPayload,
  ): Promise<{ processed: boolean; duplicate?: boolean }> {
    if (!signatureHeader) {
      throw new BadRequestException('Missing X-Hub-Signature-256 header.');
    }

    const bodyString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');

    // Expected signature format: "sha256=<hex_digest>"
    const expectedSignature =
      'sha256=' +
      crypto
        .createHmac('sha256', this.appSecret)
        .update(bodyString)
        .digest('hex');

    if (signatureHeader !== expectedSignature) {
      this.logger.error('❌ Inbound WhatsApp webhook signature mismatch!');
      throw new BadRequestException('Invalid webhook signature.');
    }

    // Process entry changes
    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        const val = change.value;

        // 1. Process delivery / read statuses
        if (val.statuses && val.statuses.length > 0) {
          for (const statusUpdate of val.statuses) {
            const idempotencyKey = `wa_status_${statusUpdate.id}_${statusUpdate.status}`;

            // Check if already processed
            const existing = await this.prisma.whatsAppMessage.findFirst({
              where: { idempotencyKey },
            });
            if (existing) {
              this.logger.log(`🔁 Webhook status update duplicate skipped: ${idempotencyKey}`);
              return { processed: true, duplicate: true };
            }

            const mappedStatus = this.mapStatus(statusUpdate.status);
            await this.prisma.whatsAppMessage.updateMany({
              where: { gatewayMessageId: statusUpdate.id },
              data: {
                status: mappedStatus,
                idempotencyKey,
              },
            });

            this.logger.log(`📬 Message ${statusUpdate.id} updated status to ${mappedStatus}`);
          }
        }

        // 2. Process inbound patient messages
        if (val.messages && val.messages.length > 0) {
          for (const incoming of val.messages) {
            const idempotencyKey = `wa_inbound_${incoming.id}`;

            const existing = await this.prisma.whatsAppMessage.findUnique({
              where: { idempotencyKey },
            });
            if (existing) {
              return { processed: true, duplicate: true };
            }

            // Find clinic by display phone or fallback to first clinic
            let clinic = await this.prisma.clinic.findFirst();
            if (!clinic) continue;

            const user = await this.prisma.user.findFirst({
              where: { phoneNumber: `+${incoming.from}` },
            });

            await this.prisma.whatsAppMessage.create({
              data: {
                clinicId: clinic.id,
                userId: user ? user.id : null,
                phoneNumber: `+${incoming.from}`,
                direction: 'INBOUND',
                messageType: incoming.type.toUpperCase(),
                content: incoming.text?.body || '[Non-text message]',
                gatewayMessageId: incoming.id,
                status: 'DELIVERED',
                idempotencyKey,
              },
            });

            this.logger.log(`📥 Received inbound message from ${incoming.from}: "${incoming.text?.body}"`);
          }
        }
      }
    }

    return { processed: true };
  }

  /**
   * List clinic WhatsApp message logs (Staff/Admin)
   */
  async listClinicMessages(clinicId: string): Promise<WhatsAppMessageDto[]> {
    const list = await this.prisma.whatsAppMessage.findMany({
      where: { clinicId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return list.map((m) => this.mapToDto(m));
  }

  private mapStatus(status: string): string {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'DELIVERED';
      case 'read':
        return 'READ';
      case 'failed':
        return 'FAILED';
      default:
        return 'SENT';
    }
  }

  private mapToDto(m: any): WhatsAppMessageDto {
    return {
      id: m.id,
      clinicId: m.clinicId,
      userId: m.userId,
      phoneNumber: m.phoneNumber,
      direction: m.direction,
      messageType: m.messageType,
      content: m.content,
      gatewayMessageId: m.gatewayMessageId,
      status: m.status as WhatsAppMessageStatus,
      createdAt: m.createdAt.toISOString(),
    };
  }

  /**
   * Helper to sign payloads for tests
   */
  generateTestHubSignature(payload: string): string {
    return (
      'sha256=' +
      crypto
        .createHmac('sha256', this.appSecret)
        .update(payload)
        .digest('hex')
    );
  }
}
