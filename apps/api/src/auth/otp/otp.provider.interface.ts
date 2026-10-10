export interface IOtpProvider {
  sendOtp(phoneNumber: string, otp: string): Promise<boolean>;
}

export const OTP_PROVIDER_TOKEN = 'OTP_PROVIDER_TOKEN';
