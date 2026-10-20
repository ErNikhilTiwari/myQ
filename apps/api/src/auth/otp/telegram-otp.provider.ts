import { Injectable, Logger } from '@nestjs/common';
import { IOtpProvider } from './otp.provider.interface';
import * as https from 'https';

@Injectable()
export class TelegramOtpProvider implements IOtpProvider {
  private readonly logger = new Logger(TelegramOtpProvider.name);
  private readonly botToken = process.env.TELEGRAM_BOT_TOKEN;
  private readonly chatId = process.env.TELEGRAM_CHAT_ID;

  async sendOtp(phoneNumber: string, otp: string): Promise<boolean> {
    if (!this.botToken || !this.chatId) {
      this.logger.warn(
        `⚠️ Telegram credentials missing. Falling back to console log: OTP for ${phoneNumber} is ${otp}`,
      );
      return true;
    }

    const text = 
`🏥 *myQ Healthcare Verification*
━━━━━━━━━━━━━━━━━━━━━━
📱 *Mobile:* \`${phoneNumber}\`
🔑 *OTP Code:* *${otp}*
⏱ *Validity:* 5 minutes

_Do not share this OTP with anyone._`;

    return new Promise((resolve) => {
      const payload = JSON.stringify({
        chat_id: this.chatId,
        text,
        parse_mode: 'Markdown',
      });

      const options: https.RequestOptions = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${this.botToken}/sendMessage`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            this.logger.log(`📬 [TELEGRAM OTP] Successfully delivered OTP for ${phoneNumber}`);
            resolve(true);
          } else {
            this.logger.error(`❌ [TELEGRAM OTP] Failed with status ${res.statusCode}: ${body}`);
            resolve(false);
          }
        });
      });

      req.on('error', (err) => {
        this.logger.error(`❌ [TELEGRAM OTP] Request error: ${err.message}`);
        resolve(false);
      });

      req.write(payload);
      req.end();
    });
  }
}
