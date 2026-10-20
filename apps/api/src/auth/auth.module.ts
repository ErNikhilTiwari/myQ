import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { OTP_PROVIDER_TOKEN } from './otp/otp.provider.interface';
import { MockOtpProvider } from './otp/mock-otp.provider';
import { TelegramOtpProvider } from './otp/telegram-otp.provider';
import { SmsOtpProvider } from './otp/sms-otp.provider';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET || 'dev_access_secret',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    MockOtpProvider,
    TelegramOtpProvider,
    SmsOtpProvider,
    {
      provide: OTP_PROVIDER_TOKEN,
      useFactory: () => {
        const provider = (process.env.OTP_PROVIDER || 'mock').trim().toLowerCase();
        if (provider === 'telegram') {
          return new TelegramOtpProvider();
        }
        if (provider === 'sms' || provider === 'msg91') {
          return new SmsOtpProvider();
        }
        return new MockOtpProvider();
      },
    },
  ],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
