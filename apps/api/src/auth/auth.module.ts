import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { OTP_PROVIDER_TOKEN } from './otp/otp.provider.interface';
import { MockOtpProvider } from './otp/mock-otp.provider';
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
    SmsOtpProvider,
    {
      provide: OTP_PROVIDER_TOKEN,
      useFactory: (
        smsProvider: SmsOtpProvider,
        mockProvider: MockOtpProvider,
      ) => {
        const provider = (process.env.OTP_PROVIDER || '').trim().toLowerCase();
        if (provider === 'sms' || provider === 'msg91' || (process.env.MSG91_AUTH_KEY && provider !== 'mock')) {
          return smsProvider;
        }
        return mockProvider;
      },
      inject: [SmsOtpProvider, MockOtpProvider],
    },
  ],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
