import { Injectable, Logger } from '@nestjs/common';
import { IOtpProvider } from './otp.provider.interface';

@Injectable()
export class MockOtpProvider implements IOtpProvider {
  private readonly logger = new Logger(MockOtpProvider.name);
  public lastSentOtps = new Map<string, string>();

  async sendOtp(phoneNumber: string, otp: string): Promise<boolean> {
    this.lastSentOtps.set(phoneNumber, otp);
    this.logger.log(`📱 [MOCK OTP] Sent code "${otp}" to mobile number "${phoneNumber}"`);
    return true;
  }
}
