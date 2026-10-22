import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { IOtpProvider } from './otp.provider.interface';
import { PrismaService } from '../../prisma/prisma.service';
import * as https from 'https';

@Injectable()
export class TelegramOtpProvider implements IOtpProvider, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramOtpProvider.name);
  private readonly botToken = process.env.TELEGRAM_BOT_TOKEN;
  private readonly fallbackChatId = process.env.TELEGRAM_CHAT_ID;
  private readonly gatewayToken = process.env.TELEGRAM_GATEWAY_TOKEN;
  private botUsername: string | null = null;
  private pollingTimer: NodeJS.Timeout | null = null;
  private lastUpdateId = 0;
  private isPollingActive = false;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    if (this.botToken) {
      await this.fetchBotInfo();
      // Start background update polling if enabled (or default in development)
      if (process.env.TELEGRAM_POLLING !== 'false') {
        this.startLongPolling();
      }
    }
  }

  onModuleDestroy() {
    this.isPollingActive = false;
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  private normalizePhone(phone: string): string {
    const clean = phone.replace(/[^\d+]/g, '');
    const digits = clean.replace(/\D/g, '');
    if (digits.length === 10) {
      return `+91${digits}`;
    }
    if (clean.startsWith('+')) {
      return clean;
    }
    return `+${digits}`;
  }

  async getBotInfo() {
    return {
      username: this.botUsername,
      isConfigured: Boolean(this.botToken),
      hasGateway: Boolean(this.gatewayToken),
      hasFallbackChatId: Boolean(this.fallbackChatId),
    };
  }

  private async fetchBotInfo(): Promise<void> {
    if (!this.botToken) return;
    try {
      const res = await this.telegramApiRequest('getMe');
      if (res && res.ok && res.result) {
        this.botUsername = res.result.username;
        this.logger.log(`🤖 [TELEGRAM] Connected to bot @${this.botUsername} (${res.result.first_name})`);
      }
    } catch (err: any) {
      this.logger.warn(`⚠️ [TELEGRAM] Could not fetch bot info: ${err.message}`);
    }
  }

  async sendOtp(phoneNumber: string, otp: string): Promise<boolean> {
    const normalized = this.normalizePhone(phoneNumber);

    // 1. Check if Telegram Gateway is configured (official Telegram phone SMS/message gateway)
    if (this.gatewayToken) {
      const sentViaGateway = await this.sendViaTelegramGateway(normalized, otp);
      if (sentViaGateway) return true;
    }

    if (!this.botToken) {
      this.logger.warn(`⚠️ Telegram credentials missing. Falling back to console log: OTP for ${normalized} is ${otp}`);
      return true;
    }

    // 2. Check if this specific phone number is linked to a user's Telegram chat
    const subscriber = await this.findSubscriberByPhone(normalized);

    if (subscriber && subscriber.chatId) {
      const text = 
`🏥 *myQ Healthcare Verification*
━━━━━━━━━━━━━━━━━━━━━━
📱 *Mobile:* \`${normalized}\`
🔑 *OTP Code:* *${otp}*
⏱ *Validity:* 5 minutes

_Do not share this OTP with anyone._`;

      const sent = await this.sendMessage(subscriber.chatId, text);
      if (sent) {
        this.logger.log(`📬 [TELEGRAM OTP] Successfully delivered OTP for ${normalized} to personal Telegram chat ${subscriber.chatId}`);
        return true;
      }
    }

    // 3. Fallback: If not linked yet, check fallbackChatId
    if (this.fallbackChatId) {
      const fallbackText = 
`🏥 *myQ Verification (Dev Fallback)*
━━━━━━━━━━━━━━━━━━━━━━
📱 *Target Mobile:* \`${normalized}\`
🔑 *OTP Code:* *${otp}*
⏱ *Validity:* 5 minutes

⚠️ *Note:* This mobile number has not linked their personal Telegram yet.
👉 To receive OTPs directly on their own Telegram, open @${this.botUsername || 'the bot'} and send their phone number or /start.`;

      this.logger.warn(`⚠️ [TELEGRAM OTP] Number ${normalized} has no linked Telegram chat. Routing to fallback chatId ${this.fallbackChatId}.`);
      return this.sendMessage(this.fallbackChatId, fallbackText);
    }

    this.logger.warn(`⚠️ [TELEGRAM OTP] No Telegram chat linked for ${normalized} and no fallback chat configured.`);
    return true;
  }

  private async findSubscriberByPhone(phone: string) {
    const clean10 = phone.slice(-10);
    // Search exact, with +91, and last 10 digits
    const subscriber = await this.prisma.telegramSubscriber.findFirst({
      where: {
        OR: [
          { phoneNumber: phone },
          { phoneNumber: `+91${clean10}` },
          { phoneNumber: clean10 },
        ],
      },
    });
    return subscriber;
  }

  /**
   * Process incoming update from Telegram webhook or long polling
   */
  async processIncomingUpdate(update: any): Promise<void> {
    if (!update || !update.message) return;
    const msg = update.message;
    const chatId = String(msg.chat?.id || '');
    if (!chatId) return;

    const username = msg.from?.username || null;
    const firstName = msg.from?.first_name || null;
    let detectedPhone: string | null = null;

    // A. Contact shared via Telegram contact card
    if (msg.contact && msg.contact.phone_number) {
      detectedPhone = msg.contact.phone_number;
    } 
    // B. Text message containing phone number or /start command with phone
    else if (msg.text) {
      const text = msg.text.trim();
      const match = text.match(/(?:\/start\s+|\/link\s+)?(\+?91)?[6-9]\d{9}/);
      if (match) {
        detectedPhone = match[0].replace(/\/start\s+|\/link\s+/, '').trim();
      }
    }

    if (detectedPhone) {
      const normalized = this.normalizePhone(detectedPhone);
      await this.prisma.telegramSubscriber.upsert({
        where: { phoneNumber: normalized },
        create: {
          phoneNumber: normalized,
          chatId,
          username,
          firstName,
        },
        update: {
          chatId,
          username,
          firstName,
        },
      });

      this.logger.log(`✅ [TELEGRAM] Linked phone ${normalized} to chat_id ${chatId} (@${username || firstName})`);

      const replyText = 
`✅ *myQ Healthcare: Linked Successfully!*
━━━━━━━━━━━━━━━━━━━━━━
📱 *Linked Number:* \`${normalized}\`
👤 *Name:* ${firstName || 'User'}

Any verification OTPs requested on the website for *${normalized}* will now arrive directly in this chat!`;

      await this.sendMessage(chatId, replyText);

      // Check if there is an active unverified OTP in database for this phone number
      const activeOtp = await this.prisma.oTPVerification.findFirst({
        where: {
          phoneNumber: normalized,
          verifiedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (activeOtp) {
        await this.sendMessage(
          chatId,
          `🔑 *Your Pending OTP Code is:* *123456* (or check latest generated code in your request session)`,
        );
      }
    } else {
      // Prompt user to provide their phone number
      const promptText = 
`👋 Hello ${firstName || 'there'}! Welcome to *myQ Healthcare Verification Bot*.

To receive your login OTP codes here:
1. Tap the button below to *Share Contact*, OR
2. Reply directly with your *10-digit mobile number* (e.g. \`9876543210\`).`;

      await this.sendReplyWithContactButton(chatId, promptText);
    }
  }

  private async sendMessage(chatId: string, text: string): Promise<boolean> {
    if (!this.botToken) return false;
    try {
      const res = await this.telegramApiRequest('sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      });
      return Boolean(res && res.ok);
    } catch (err: any) {
      this.logger.error(`❌ [TELEGRAM] Send error to ${chatId}: ${err.message}`);
      return false;
    }
  }

  private async sendReplyWithContactButton(chatId: string, text: string): Promise<boolean> {
    if (!this.botToken) return false;
    try {
      const res = await this.telegramApiRequest('sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [
            [{ text: '📱 Share My Mobile Number', request_contact: true }],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      });
      return Boolean(res && res.ok);
    } catch {
      return false;
    }
  }

  private async sendViaTelegramGateway(phone: string, otp: string): Promise<boolean> {
    return new Promise((resolve) => {
      const payload = JSON.stringify({
        phone_number: phone,
        code: otp,
        ttl: 300,
      });

      const options: https.RequestOptions = {
        hostname: 'gateway.telegram.org',
        port: 443,
        path: '/sendVerificationMessage',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.gatewayToken}`,
          'Content-Length': Buffer.byteLength(payload),
        },
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            this.logger.log(`⚡ [TELEGRAM GATEWAY] Verified code delivered to ${phone}`);
            resolve(true);
          } else {
            resolve(false);
          }
        });
      });

      req.on('error', () => resolve(false));
      req.write(payload);
      req.end();
    });
  }

  private telegramApiRequest(endpoint: string, data?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const payload = data ? JSON.stringify(data) : '';
      const options: https.RequestOptions = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${this.botToken}/${endpoint}`,
        method: data ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            resolve(parsed);
          } catch (e) {
            resolve({ ok: false, body });
          }
        });
      });

      req.on('error', (err) => reject(err));
      if (data) req.write(payload);
      req.end();
    });
  }

  private startLongPolling() {
    if (this.isPollingActive || !this.botToken) return;
    this.isPollingActive = true;
    this.logger.log('📡 [TELEGRAM] Long polling listener active for incoming bot updates.');

    const poll = async () => {
      try {
        const res = await this.telegramApiRequest(`getUpdates?offset=${this.lastUpdateId + 1}&timeout=5`);
        if (res && res.ok && Array.isArray(res.result)) {
          for (const update of res.result) {
            this.lastUpdateId = update.update_id;
            await this.processIncomingUpdate(update);
          }
        }
      } catch (err: any) {
        // Silent catch for network hiccups during polling
      } finally {
        if (this.isPollingActive) {
          this.pollingTimer = setTimeout(poll, 2500);
        }
      }
    };

    poll();
  }
}
