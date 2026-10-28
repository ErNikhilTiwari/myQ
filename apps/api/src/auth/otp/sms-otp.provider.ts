import { Injectable, Logger } from '@nestjs/common';
import { IOtpProvider } from './otp.provider.interface';
import * as https from 'https';

@Injectable()
export class SmsOtpProvider implements IOtpProvider {
  private readonly logger = new Logger(SmsOtpProvider.name);
  private readonly authKey = process.env.MSG91_AUTH_KEY;
  private readonly templateId = process.env.MSG91_TEMPLATE_ID;

  async sendOtp(phoneNumber: string, otp: string): Promise<boolean> {
    if (!this.authKey || !this.templateId) {
      if (process.env.NODE_ENV === 'production') {
        this.logger.error(
          `❌ [SMS OTP] MSG91 credentials missing in production! Configure MSG91_AUTH_KEY and MSG91_TEMPLATE_ID. Delivery to ${phoneNumber} aborted.`,
        );
        return false;
      }
      this.logger.warn(
        `⚠️ MSG91 credentials missing. Falling back to dev console log: OTP for ${phoneNumber} is ${otp}`,
      );
      return true;
    }

    const mobile = phoneNumber.replace(/^\+/, '');

    return new Promise((resolve) => {
      const payload = JSON.stringify({
        template_id: this.templateId,
        mobile,
        otp,
      });

      const options: https.RequestOptions = {
        hostname: 'control.msg91.com',
        port: 443,
        path: '/api/v5/otp',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authkey: this.authKey,
          'Content-Length': Buffer.byteLength(payload),
        },
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            this.logger.log(`📱 [SMS OTP] Successfully delivered OTP via MSG91 to ${phoneNumber}`);
            resolve(true);
          } else {
            this.logger.error(`❌ [SMS OTP] MSG91 returned status ${res.statusCode}: ${body}`);
            resolve(false);
          }
        });
      });

      req.on('error', (err) => {
        this.logger.error(`❌ [SMS OTP] MSG91 request error: ${err.message}`);
        resolve(false);
      });

      req.write(payload);
      req.end();
    });
  }
}
