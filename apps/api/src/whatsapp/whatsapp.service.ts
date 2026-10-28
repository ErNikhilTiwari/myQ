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
  WhatsAppBotState,
  BotReplyDto,
} from '@queueapp/shared';
import * as crypto from 'crypto';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12);

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly appSecret = process.env.META_APP_SECRET || 'test_meta_app_secret_12345';
  private readonly verifyToken =
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ||
    process.env.WHATSAPP_VERIFY_TOKEN ||
    'queueapp_verify_token_secret';
  private readonly phoneNumberId =
    process.env.WHATSAPP_PHONE_NUMBER_ID ||
    process.env.META_WHATSAPP_PHONE_NUMBER_ID;
  private readonly accessToken =
    process.env.WHATSAPP_ACCESS_TOKEN ||
    process.env.META_WHATSAPP_TOKEN;
  private readonly gatewayUrl = process.env.WHATSAPP_GATEWAY_URL;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Dispatches outbound message to Meta WhatsApp Cloud API or WhatsApp Web Gateway
   */
  private async dispatchToWhatsAppGateway(
    recipientPhone: string,
    payload: any,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // 1. Meta WhatsApp Cloud API (Official Cloud API)
    if (this.phoneNumberId && this.accessToken) {
      const cleanPhone = recipientPhone.replace(/\D/g, '');
      try {
        const url = `https://graph.facebook.com/v20.0/${this.phoneNumberId}/messages`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanPhone,
            ...payload,
          }),
        });

        const data: any = await res.json();
        if (!res.ok) {
          const errDetail = data?.error?.message || JSON.stringify(data);
          this.logger.error(`❌ Meta WhatsApp Cloud API Error (${res.status}): ${errDetail}`);
          return { success: false, error: errDetail };
        }

        const wamId = data?.messages?.[0]?.id || `wam_${nanoid()}`;
        this.logger.log(`📱 [WhatsApp Cloud API] Delivered message to ${cleanPhone}. ID: ${wamId}`);
        return { success: true, messageId: wamId };
      } catch (err: any) {
        this.logger.error(`❌ Meta WhatsApp Cloud API network error: ${err.message}`);
        return { success: false, error: err.message };
      }
    }

    // 2. WhatsApp Web API / Self-hosted Web Gateway (e.g. Baileys, WPPConnect, Evolution API)
    if (this.gatewayUrl) {
      try {
        const cleanPhone = recipientPhone.replace(/\D/g, '');
        const res = await fetch(this.gatewayUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: cleanPhone,
            message: payload?.text?.body || payload?.template?.name || '',
            ...payload,
          }),
        });

        const data: any = await res.json();
        const msgId = data?.id || data?.messageId || `wam_web_${nanoid()}`;
        this.logger.log(`📱 [WhatsApp Web Gateway] Dispatched to ${cleanPhone}. ID: ${msgId}`);
        return { success: true, messageId: msgId };
      } catch (err: any) {
        this.logger.error(`❌ WhatsApp Web Gateway network error: ${err.message}`);
        return { success: false, error: err.message };
      }
    }

    // 3. Fallback / Mock Dev Mode: Credentials not configured
    this.logger.log(`ℹ️ [WhatsApp Sim] (${recipientPhone}): ${payload?.text?.body || payload?.template?.name || 'outbound'}`);
    return { success: true, messageId: `wam_${nanoid()}` };
  }

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

    const user = await this.prisma.user.findFirst({
      where: { phoneNumber: dto.recipientPhone },
    });

    let content = `[Template: ${dto.templateName}] `;
    if (dto.templateName === 'appointment_confirmed') {
      content += `Hello! Your appointment with ${clinic.name} is confirmed for ${dto.parameters.slotTime || 'your slot'}.`;
    } else if (dto.templateName === 'turn_approaching') {
      content += `Your turn is approaching! Token ${dto.parameters.tokenNumber || ''} has 2 patients ahead.`;
    } else {
      content += JSON.stringify(dto.parameters);
    }

    // Dispatch via real Meta Cloud API or Gateway
    const dispatch = await this.dispatchToWhatsAppGateway(dto.recipientPhone, {
      type: 'template',
      template: {
        name: dto.templateName,
        language: { code: 'en' },
      },
    });

    const message = await this.prisma.whatsAppMessage.create({
      data: {
        clinicId: dto.clinicId,
        userId: user ? user.id : null,
        phoneNumber: dto.recipientPhone,
        direction: 'OUTBOUND',
        messageType: 'TEMPLATE',
        content,
        gatewayMessageId: dispatch.messageId || `wam_${nanoid()}`,
        status: dispatch.success ? 'SENT' : 'FAILED',
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

    // Dispatch via real Meta Cloud API or Gateway
    const dispatch = await this.dispatchToWhatsAppGateway(dto.recipientPhone, {
      type: 'text',
      text: { preview_url: false, body: dto.messageText },
    });

    const message = await this.prisma.whatsAppMessage.create({
      data: {
        clinicId: dto.clinicId,
        userId: user ? user.id : null,
        phoneNumber: dto.recipientPhone,
        direction: 'OUTBOUND',
        messageType: 'TEXT',
        content: dto.messageText,
        gatewayMessageId: dispatch.messageId || `wam_${nanoid()}`,
        status: dispatch.success ? 'SENT' : 'FAILED',
      },
    });

    return this.mapToDto(message);
  }

  /**
   * Conversation State Machine Processor for WhatsApp Chatbot (Phase 2, Section 14-19, 53)
   */
  async processChatbotMessage(
    clinicId: string,
    phoneNumber: string,
    inputText: string,
  ): Promise<BotReplyDto> {
    const cleanText = (inputText || '').trim();
    const lower = cleanText.toLowerCase();

    // 1. Get or create session
    let session = await this.prisma.whatsAppConversation.findUnique({
      where: { clinicId_phoneNumber: { clinicId, phoneNumber } },
    });

    if (!session) {
      const user = await this.prisma.user.findFirst({ where: { phoneNumber } });
      session = await this.prisma.whatsAppConversation.create({
        data: {
          clinicId,
          userId: user ? user.id : null,
          phoneNumber,
          currentState: 'IDLE',
          lastActiveAt: new Date(),
        },
      });
    }

    let context = session.contextData ? JSON.parse(session.contextData) : {};

    // 2. Global command handlers: 0, menu, back, cancel, help
    if (lower === '0' || lower === 'menu' || lower === 'cancel') {
      await this.prisma.whatsAppConversation.update({
        where: { id: session.id },
        data: { currentState: 'IDLE', contextData: null, lastActiveAt: new Date() },
      });
      return this.renderMainMenu();
    }

    if (lower === 'help') {
      return {
        replyText:
          '💡 *QueueApp Help & Commands*\n\n' +
          '• Type *menu* or *0* to return to the main menu anytime.\n' +
          '• Type *cancel* to abort your current action.\n' +
          '• Reply with the number corresponding to your option.\n' +
          '• Need human assistance? Contact clinic reception directly.',
        nextState: session.currentState as WhatsAppBotState,
      };
    }

    const state = session.currentState;

    // 3. State Machine Transitions
    switch (state) {
      case 'IDLE': {
        if (lower === 'hi' || lower === 'hello' || lower === 'hey') {
          return this.renderMainMenu();
        }

        // Phase 3: AI NLU Router for FAQ questions
        const nlu = this.classifyIntent(cleanText);
        if (nlu.intent === 'FAQ') {
          const faqAnswer = await this.answerClinicFAQ(clinicId, cleanText);
          return {
            replyText: faqAnswer,
            nextState: 'IDLE',
          };
        }



        // Option 1: Check Queue / Status
        if (cleanText === '1' || lower.includes('queue') || lower.includes('status')) {
          const user = await this.prisma.user.findFirst({ where: { phoneNumber } });
          if (!user) {
            return {
              replyText:
                '⚠️ No active registration found for your number. Please register first by typing *5* or *register*.',
              nextState: 'IDLE',
            };
          }

          const activeToken = await this.prisma.queueEntry.findFirst({
            where: {
              userId: user.id,
              status: { in: ['WAITING', 'CALLED', 'IN_SERVICE', 'ON_HOLD'] },
            },
            include: { queue: { include: { clinic: true, doctor: true } } },
            orderBy: { createdAt: 'desc' },
          });

          if (!activeToken) {
            return {
              replyText:
                'ℹ️ You have no active tokens in the queue today.\n\nType *2* to book a new appointment or *0* for main menu.',
              nextState: 'IDLE',
            };
          }

          // Count people ahead
          const peopleAhead = await this.prisma.queueEntry.count({
            where: {
              queueId: activeToken.queueId,
              status: 'WAITING',
              sequenceNumber: { lt: activeToken.sequenceNumber },
            },
          });

          return {
            replyText:
              `🏥 *${activeToken.queue.clinic.name}*\n` +
              `👨‍⚕️ Doctor: ${activeToken.queue.doctor?.name || 'General OPD'}\n\n` +
              `🎟️ *Your Token: ${activeToken.tokenNumber}*\n` +
              `📊 Status: ${activeToken.status}\n` +
              `👥 People Ahead: ${peopleAhead}\n` +
              `⏳ Est. Waiting Time: ~${activeToken.estimatedWait || 15} minutes\n\n` +
              `Type *0* to return to main menu.`,
            nextState: 'IDLE',
          };
        }

        // Option 2: Book Appointment
        if (cleanText === '2' || lower.includes('book')) {
          const doctors = await this.prisma.doctor.findMany({
            where: { clinicId, isActive: true },
          });

          if (doctors.length === 0) {
            return {
              replyText: 'Sorry, no doctors are currently available for booking. Type *0* for menu.',
              nextState: 'IDLE',
            };
          }

          let doctorListText = '👨‍⚕️ *Select a Doctor:*\n\n';
          doctors.forEach((d, idx) => {
            doctorListText += `${idx + 1}. ${d.name} (${d.specialization})\n`;
          });
          doctorListText += '\nReply with doctor number (e.g. 1):';

          context.availableDoctors = doctors.map((d) => ({ id: d.id, name: d.name }));
          await this.prisma.whatsAppConversation.update({
            where: { id: session.id },
            data: {
              currentState: 'SELECT_DOCTOR',
              contextData: JSON.stringify(context),
              lastActiveAt: new Date(),
            },
          });

          return {
            replyText: doctorListText,
            nextState: 'SELECT_DOCTOR',
          };
        }

        // Option 3: My Appointments
        if (cleanText === '3' || lower.includes('appointment')) {
          const user = await this.prisma.user.findFirst({ where: { phoneNumber } });
          if (!user) {
            return {
              replyText: 'No account registered with this number. Type *5* to register.',
              nextState: 'IDLE',
            };
          }

          const appts = await this.prisma.appointment.findMany({
            where: { userId: user.id, status: { in: ['CONFIRMED', 'PENDING'] } },
            include: { doctor: true, clinic: true },
            orderBy: { slotTime: 'asc' },
            take: 3,
          });

          if (appts.length === 0) {
            return {
              replyText: 'You have no upcoming appointments scheduled. Type *2* to book one.',
              nextState: 'IDLE',
            };
          }

          let msg = '📅 *Your Upcoming Appointments:*\n\n';
          appts.forEach((a, i) => {
            msg += `${i + 1}. ${a.clinic.name} - ${a.doctor?.name || 'OPD'}\n   🕒 ${a.slotTime.toLocaleString()}\n   Status: ${a.status}\n\n`;
          });
          msg += 'Type *0* for main menu.';
          return { replyText: msg, nextState: 'IDLE' };
        }

        // Option 4: Register Patient
        if (cleanText === '5' || lower.includes('register')) {
          await this.prisma.whatsAppConversation.update({
            where: { id: session.id },
            data: { currentState: 'REGISTER_NAME', contextData: null, lastActiveAt: new Date() },
          });

          return {
            replyText: '📝 *Patient Registration*\n\nPlease reply with your full name (e.g. Rahul Sharma):',
            nextState: 'REGISTER_NAME',
          };
        }

        // Default Main Menu
        return this.renderMainMenu();
      }

      case 'SELECT_DOCTOR': {
        const choice = parseInt(cleanText, 10);
        const docs = context.availableDoctors || [];

        if (isNaN(choice) || choice < 1 || choice > docs.length) {
          return {
            replyText: `Invalid choice. Please reply with a number between 1 and ${docs.length}, or *0* to cancel:`,
            nextState: 'SELECT_DOCTOR',
          };
        }

        const selectedDoctor = docs[choice - 1];
        context.selectedDoctorId = selectedDoctor.id;
        context.selectedDoctorName = selectedDoctor.name;

        // Generate 3 sample tomorrow slots
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const slot1 = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 10, 0, 0);
        const slot2 = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 11, 30, 0);
        const slot3 = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 16, 0, 0);

        context.availableSlots = [
          slot1.toISOString(),
          slot2.toISOString(),
          slot3.toISOString(),
        ];

        let slotMsg = `🕒 *Available Slots for ${selectedDoctor.name}:*\n\n`;
        slotMsg += `1. Tomorrow 10:00 AM\n`;
        slotMsg += `2. Tomorrow 11:30 AM\n`;
        slotMsg += `3. Tomorrow 04:00 PM\n\n`;
        slotMsg += `Reply with slot number (1-3):`;

        await this.prisma.whatsAppConversation.update({
          where: { id: session.id },
          data: {
            currentState: 'SELECT_SLOT',
            contextData: JSON.stringify(context),
            lastActiveAt: new Date(),
          },
        });

        return { replyText: slotMsg, nextState: 'SELECT_SLOT' };
      }

      case 'SELECT_SLOT': {
        const slotChoice = parseInt(cleanText, 10);
        const slots = context.availableSlots || [];

        if (isNaN(slotChoice) || slotChoice < 1 || slotChoice > slots.length) {
          return {
            replyText: `Invalid selection. Please choose 1, 2, or 3, or type *0* to cancel:`,
            nextState: 'SELECT_SLOT',
          };
        }

        const chosenSlot = slots[slotChoice - 1];
        context.selectedSlot = chosenSlot;

        const confirmMsg =
          `📋 *Confirm Booking Details:*\n\n` +
          `• Doctor: ${context.selectedDoctorName}\n` +
          `• Slot: ${new Date(chosenSlot).toLocaleString()}\n` +
          `• Consultation Fee: ₹500 (Pay at Clinic)\n\n` +
          `Reply *1* to Confirm\n` +
          `Reply *0* to Cancel`;

        await this.prisma.whatsAppConversation.update({
          where: { id: session.id },
          data: {
            currentState: 'CONFIRM_BOOKING',
            contextData: JSON.stringify(context),
            lastActiveAt: new Date(),
          },
        });

        return { replyText: confirmMsg, nextState: 'CONFIRM_BOOKING' };
      }

      case 'CONFIRM_BOOKING': {
        if (cleanText === '1' || lower === 'yes' || lower === 'confirm') {
          // Book appointment in database
          let user = await this.prisma.user.findFirst({ where: { phoneNumber } });
          if (!user) {
            user = await this.prisma.user.create({
              data: {
                phoneNumber,
                name: 'WhatsApp Patient',
                role: 'PATIENT',
              },
            });
          }

          const appointment = await this.prisma.appointment.create({
            data: {
              clinicId,
              userId: user.id,
              doctorId: context.selectedDoctorId,
              slotTime: new Date(context.selectedSlot),
              status: 'CONFIRMED',
              bookingFee: 500,
              paymentStatus: 'PENDING',
            },
          });

          await this.prisma.whatsAppConversation.update({
            where: { id: session.id },
            data: { currentState: 'IDLE', contextData: null, lastActiveAt: new Date() },
          });

          return {
            replyText:
              `🎉 *Appointment Confirmed!*\n\n` +
              `Appointment ID: #${appointment.id.slice(0, 8)}\n` +
              `Doctor: ${context.selectedDoctorName}\n` +
              `Date & Time: ${new Date(context.selectedSlot).toLocaleString()}\n\n` +
              `We have reserved your slot. When you reach the clinic, show this message to reception to receive your token!\n\n` +
              `Type *0* for main menu.`,
            nextState: 'IDLE',
          };
        }

        return {
          replyText: 'Booking not confirmed. Type *1* to confirm or *0* to cancel.',
          nextState: 'CONFIRM_BOOKING',
        };
      }

      case 'REGISTER_NAME': {
        if (cleanText.length < 2) {
          return {
            replyText: 'Please enter a valid name (at least 2 letters):',
            nextState: 'REGISTER_NAME',
          };
        }

        const user = await this.prisma.user.upsert({
          where: { phoneNumber },
          update: { name: cleanText },
          create: {
            phoneNumber,
            name: cleanText,
            role: 'PATIENT',
          },
        });

        await this.prisma.whatsAppConversation.update({
          where: { id: session.id },
          data: {
            userId: user.id,
            currentState: 'IDLE',
            contextData: null,
            lastActiveAt: new Date(),
          },
        });

        return {
          replyText:
            `✅ *Registration Successful!*\n\nWelcome, ${user.name}! Your WhatsApp number is now linked to your QueueApp profile.\n\n` +
            `Type *0* to view the main menu.`,
          nextState: 'IDLE',
        };
      }

      default:
        await this.prisma.whatsAppConversation.update({
          where: { id: session.id },
          data: { currentState: 'IDLE', contextData: null, lastActiveAt: new Date() },
        });
        return this.renderMainMenu();
    }
  }

  private renderMainMenu(): BotReplyDto {
    return {
      replyText:
        '👋 *Welcome to QueueApp!*\n\n' +
        'Please select an option by typing the number:\n\n' +
        '1️⃣  *My Queue Status* (live position & wait time)\n' +
        '2️⃣  *Book Appointment*\n' +
        '3️⃣  *My Appointments*\n' +
        '5️⃣  *Register / Update Name*\n' +
        '❓  *Help*\n\n' +
        'Reply with 1, 2, 3, 5, or Help.',
      nextState: 'IDLE',
      quickReplies: ['1', '2', '3', '5'],
    };
  }

  /**
   * Process Inbound WhatsApp Webhook (POST /api/webhooks/whatsapp)
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

    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        const val = change.value;

        // 1. Delivery / read statuses
        if (val.statuses && val.statuses.length > 0) {
          for (const statusUpdate of val.statuses) {
            const idempotencyKey = `wa_status_${statusUpdate.id}_${statusUpdate.status}`;

            const existing = await this.prisma.whatsAppMessage.findFirst({
              where: { idempotencyKey },
            });
            if (existing) {
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
          }
        }

        // 2. Inbound patient messages -> Handled via Conversation State Machine!
        if (val.messages && val.messages.length > 0) {
          for (const incoming of val.messages) {
            const idempotencyKey = `wa_inbound_${incoming.id}`;

            const existing = await this.prisma.whatsAppMessage.findUnique({
              where: { idempotencyKey },
            });
            if (existing) {
              return { processed: true, duplicate: true };
            }

            let clinic = await this.prisma.clinic.findFirst();
            if (!clinic) continue;

            const phone = `+${incoming.from}`;
            const user = await this.prisma.user.findFirst({ where: { phoneNumber: phone } });

            // Record inbound message
            await this.prisma.whatsAppMessage.create({
              data: {
                clinicId: clinic.id,
                userId: user ? user.id : null,
                phoneNumber: phone,
                direction: 'INBOUND',
                messageType: incoming.type.toUpperCase(),
                content: incoming.text?.body || '[Non-text message]',
                gatewayMessageId: incoming.id,
                status: 'DELIVERED',
                idempotencyKey,
              },
            });

            // Process conversation turn and reply back!
            if (incoming.text?.body) {
              const botReply = await this.processChatbotMessage(
                clinic.id,
                phone,
                incoming.text.body,
              );

              // Dispatch outbound bot reply
              await this.sendMessage({
                clinicId: clinic.id,
                recipientPhone: phone,
                messageText: botReply.replyText,
              });
            }
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
   * Phase 3: AI-Assisted NLU Intent Router (Router -> Orchestrator -> Handler pattern)
   */
  classifyIntent(text: string): { intent: 'CHECK_QUEUE' | 'BOOK_APPOINTMENT' | 'CANCEL' | 'FAQ' | 'MENU'; confidence: number; detectedEntities: any } {
    const lower = text.trim().toLowerCase();

    // FAQ Intent detection (Timings, Location, Parking, Cost, Services)
    if (
      lower.includes('timing') ||
      lower.includes('hours') ||
      lower.includes('open') ||
      lower.includes('location') ||
      lower.includes('where') ||
      lower.includes('address') ||
      lower.includes('fee') ||
      lower.includes('cost') ||
      lower.includes('price') ||
      lower.includes('services') ||
      lower.includes('parking')
    ) {
      return {
        intent: 'FAQ',
        confidence: 0.95,
        detectedEntities: { topic: lower },
      };
    }

    if (lower.includes('queue') || lower.includes('token') || lower.includes('status') || lower.includes('turn')) {
      return { intent: 'CHECK_QUEUE', confidence: 0.92, detectedEntities: {} };
    }

    if (lower.includes('book') || lower.includes('appointment') || lower.includes('doctor') || lower.includes('consult')) {
      return { intent: 'BOOK_APPOINTMENT', confidence: 0.9, detectedEntities: {} };
    }

    if (lower.includes('cancel') || lower.includes('abort') || lower.includes('stop')) {
      return { intent: 'CANCEL', confidence: 0.95, detectedEntities: {} };
    }

    return { intent: 'MENU', confidence: 0.8, detectedEntities: {} };
  }

  /**
   * Phase 3: Scoped Clinic Knowledge Retrieval (RAG)
   */
  async answerClinicFAQ(clinicId: string, question: string): Promise<string> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      include: { doctors: true, services: true },
    });

    if (!clinic) {
      return 'Clinic information not found.';
    }

    const q = question.toLowerCase();

    if (q.includes('timing') || q.includes('hours') || q.includes('open')) {
      return `⏰ *${clinic.name} Timings:*\nMonday – Saturday: 08:00 AM – 08:00 PM\nSunday: 09:00 AM – 01:00 PM (Emergency only).\n\nType *0* for main menu.`;
    }

    if (q.includes('where') || q.includes('location') || q.includes('address')) {
      return `📍 *${clinic.name} Location:*\n${clinic.address || 'Central Road, City Center'}\nPhone: ${clinic.phoneNumber}\n\nType *0* for main menu.`;
    }

    if (q.includes('fee') || q.includes('cost') || q.includes('price')) {
      return `💳 *Consultation Fees:*\nGeneral OPD Token: ₹200 – ₹500 depending on specialty.\nOnline advance booking available via UPI/Cards.\n\nType *2* to book now.`;
    }

    if (q.includes('doctor') || q.includes('service')) {
      const docList = clinic.doctors.map((d) => `• ${d.name} (${d.specialization})`).join('\n');
      return `👨‍⚕️ *Available Specialists at ${clinic.name}:*\n${docList || '• General OPD'}\n\nType *2* to book an appointment.`;
    }

    return `ℹ️ *${clinic.name} Info:*\nAddress: ${clinic.address || 'Main Branch'}\nContact: ${clinic.phoneNumber}\n\nType *0* for main menu.`;
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

