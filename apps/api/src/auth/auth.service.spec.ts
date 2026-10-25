import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, UnauthorizedException, HttpException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { OTP_PROVIDER_TOKEN } from './otp/otp.provider.interface';
import { MockOtpProvider } from './otp/mock-otp.provider';
import { TelegramOtpProvider } from './otp/telegram-otp.provider';
import { UserRole } from '@queueapp/shared';

describe('AuthService (Unit Tests & Security Hardening)', () => {
  let service: AuthService;
  let mockOtpProvider: MockOtpProvider;

  const mockPrismaService = {
    oTPVerification: {
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    patientProfile: {
      upsert: jest.fn(),
    },
    clinic: {
      findFirst: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue('test_token'),
    verify: jest.fn(),
  };

  const mockTelegramOtpProvider = {
    getBotInfo: jest.fn().mockResolvedValue({ username: 'test_telegram_bot' }),
  };

  beforeEach(async () => {
    mockOtpProvider = new MockOtpProvider();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: OTP_PROVIDER_TOKEN, useValue: mockOtpProvider },
        { provide: TelegramOtpProvider, useValue: mockTelegramOtpProvider },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('validatePhoneNumber', () => {
    it('accepts valid 10-digit Indian mobile numbers with +91', () => {
      expect(service.validatePhoneNumber('+919876543210')).toBe('+919876543210');
      expect(service.validatePhoneNumber('+91 88888 88888')).toBe('+918888888888');
      expect(service.validatePhoneNumber('+91-77777-77777')).toBe('+917777777777');
    });

    it('rejects invalid numbers or missing country code', () => {
      expect(() => service.validatePhoneNumber('9876543210')).toThrow(BadRequestException);
      expect(() => service.validatePhoneNumber('+1234567890')).toThrow(BadRequestException);
      expect(() => service.validatePhoneNumber('+911234567890')).toThrow(BadRequestException); // starts with 1
      expect(() => service.validatePhoneNumber('+9198765')).toThrow(BadRequestException); // short
      expect(() => service.validatePhoneNumber('')).toThrow(BadRequestException);
    });
  });

  describe('sendOtp', () => {
    it('generates, hashes, saves OTP and dispatches with 0s cooldown for 1st attempt', async () => {
      mockPrismaService.oTPVerification.findFirst.mockResolvedValue(null);
      mockPrismaService.oTPVerification.count.mockResolvedValue(0);
      mockPrismaService.oTPVerification.create.mockResolvedValue({ id: 'otp-1' });

      const result = await service.sendOtp({ phoneNumber: '+919876543210' });

      expect(result.success).toBe(true);
      expect(result.expiresInSeconds).toBe(300);
      expect(result.resendCooldownSeconds).toBe(0); // No cooldown for first attempts!
      expect(mockPrismaService.oTPVerification.create).toHaveBeenCalled();
      expect(mockOtpProvider.lastSentOtps.has('+919876543210')).toBe(true);
    });

    it('enforces 10-second cooldown after 3 attempts in a single minute', async () => {
      mockPrismaService.oTPVerification.count.mockResolvedValue(3);
      mockPrismaService.oTPVerification.findFirst.mockResolvedValue({ id: 'recent-otp' });

      await expect(
        service.sendOtp({ phoneNumber: '+919876543210' }),
      ).rejects.toThrow(HttpException);
    });

    it('enforces 60-second cooldown after 5 attempts in a single minute', async () => {
      mockPrismaService.oTPVerification.count.mockResolvedValue(5);

      await expect(
        service.sendOtp({ phoneNumber: '+919876543210' }),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('verifyOtp', () => {
    it('authenticates user and returns JWT tokens on valid OTP', async () => {
      const now = new Date();
      mockPrismaService.oTPVerification.findFirst.mockResolvedValue({
        id: 'otp-1',
        phoneNumber: '+919876543210',
        hashedOtp: '$2a$10$dummyHash',
        attempts: 0,
        expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
        verifiedAt: null,
      });

      mockPrismaService.oTPVerification.update.mockResolvedValue({});
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'user-1',
        phoneNumber: '+919876543210',
        name: 'Test Patient',
        role: UserRole.PATIENT,
        staffProfiles: [],
      });
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.verifyOtp({
        phoneNumber: '+919876543210',
        otp: '123456', // Test bypass
      });

      expect(result.user.phoneNumber).toBe('+919876543210');
      expect(result.tokens.accessToken).toBe('test_token');
      expect(result.tokens.refreshToken).toBe('test_token');
    });

    it('rejects expired OTP', async () => {
      mockPrismaService.oTPVerification.findFirst.mockResolvedValue({
        id: 'otp-expired',
        phoneNumber: '+919876543210',
        hashedOtp: '$2a$10$dummyHash',
        expiresAt: new Date(Date.now() - 1000), // in the past
        attempts: 0,
      });

      await expect(
        service.verifyOtp({ phoneNumber: '+919876543210', otp: '000000' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('loginWithPassword', () => {
    it('successfully logs in with valid password and returns tokens', async () => {
      const passwordHash = await bcrypt.hash('Password@123', 10);
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'user-admin',
        phoneNumber: '+919876500011',
        name: 'Dr. Ramesh Sharma',
        role: UserRole.CLINIC_ADMIN,
        passwordHash,
        isActive: true,
        staffProfiles: [{ clinicId: 'clinic-1' }],
      });
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.loginWithPassword({
        phoneNumber: '+919876500011',
        password: 'Password@123',
      });

      expect(result.user.role).toBe(UserRole.CLINIC_ADMIN);
      expect(result.tokens.accessToken).toBe('test_token');
    });

    it('rejects incorrect password with UnauthorizedException', async () => {
      const passwordHash = await bcrypt.hash('CorrectPassword@123', 10);
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'user-admin',
        phoneNumber: '+919876500011',
        name: 'Dr. Ramesh Sharma',
        role: UserRole.CLINIC_ADMIN,
        passwordHash,
        isActive: true,
      });

      await expect(
        service.loginWithPassword({
          phoneNumber: '+919876500011',
          password: 'WrongPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects inactive or disabled user accounts', async () => {
      const passwordHash = await bcrypt.hash('Password@123', 10);
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'user-disabled',
        phoneNumber: '+919876500011',
        passwordHash,
        isActive: false, // Disabled account
      });

      await expect(
        service.loginWithPassword({
          phoneNumber: '+919876500011',
          password: 'Password@123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
