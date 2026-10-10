import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { OTP_PROVIDER_TOKEN } from './otp/otp.provider.interface';
import { MockOtpProvider } from './otp/mock-otp.provider';

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
    {
      provide: OTP_PROVIDER_TOKEN,
      useClass: MockOtpProvider,
    },
  ],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
