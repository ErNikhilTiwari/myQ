import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, UnauthorizedException, HttpException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { OTP_PROVIDER_TOKEN } from './otp/otp.provider.interface';
import { MockOtpProvider } from './otp/mock-otp.provider';
import { UserRole } from '@queueapp/shared';

describe('AuthService (Unit Tests)', () => {
  let service: AuthService;
  let mockOtpProvider: MockOtpProvider;

  const mockPrismaService = {
    oTPVerification: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue('test_token'),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    mockOtpProvider = new MockOtpProvider();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: OTP_PROVIDER_TOKEN, useValue: mockOtpProvider },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('validatePhoneNumber', () => {
    it('accepts valid 10-digit Indian mobile numbers with +91', () => {
      expect(service.validatePhoneNumber('+919876543210')).toBe('+919876543210');
      expect(service.validatePhoneNumber('+91 88888 88888')).toBe('+918888888888');
    });

    it('rejects invalid numbers or missing country code', () => {
      expect(() => service.validatePhoneNumber('9876543210')).toThrow(BadRequestException);
      expect(() => service.validatePhoneNumber('+1234567890')).toThrow(BadRequestException);
      expect(() => service.validatePhoneNumber('+911234567890')).toThrow(BadRequestException); // starts with 1
    });
  });

  describe('sendOtp', () => {
    it('generates, hashes, saves OTP and dispatches to provider', async () => {
      mockPrismaService.oTPVerification.findFirst.mockResolvedValue(null);
      mockPrismaService.oTPVerification.create.mockResolvedValue({ id: 'otp-1' });

      const result = await service.sendOtp({ phoneNumber: '+919876543210' });

      expect(result.success).toBe(true);
      expect(result.expiresInSeconds).toBe(300);
      expect(mockPrismaService.oTPVerification.create).toHaveBeenCalled();
      expect(mockOtpProvider.lastSentOtps.has('+919876543210')).toBe(true);
    });

    it('rate-limits rapid requests within 60 seconds', async () => {
      mockPrismaService.oTPVerification.findFirst.mockResolvedValue({ id: 'recent-otp' });

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
      mockPrismaService.user.findUnique.mockResolvedValue({
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
        expiresAt: new Date(Date.now() - 1000), // in the past
        attempts: 0,
      });

      await expect(
        service.verifyOtp({ phoneNumber: '+919876543210', otp: '123456' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
