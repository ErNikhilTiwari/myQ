import { UserRole } from './roles.enum';

export interface SendOtpRequestDto {
  phoneNumber: string; // E.164 format, e.g. "+919876543210"
}

export interface SendOtpResponseDto {
  success: boolean;
  message: string;
  expiresInSeconds: number;
  telegramBotUsername?: string;
}

export interface VerifyOtpRequestDto {
  phoneNumber: string;
  otp: string; // 6-digit numeric string
  name?: string; // Optional name if first-time registering patient
}

export interface AuthTokensDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthUserDto {
  id: string;
  phoneNumber: string;
  name: string;
  email?: string | null;
  role: UserRole;
  clinicId?: string;
  age?: number | null;
  gender?: string | null;
  isProfileComplete?: boolean;
}

export interface VerifyOtpResponseDto {
  user: AuthUserDto;
  tokens: AuthTokensDto;
  isNewUser: boolean;
}

export interface RefreshTokenRequestDto {
  refreshToken: string;
}

export interface LoginPasswordRequestDto {
  phoneNumber: string;
  password: string;
  name?: string;
}

export interface LoginPasswordResponseDto {
  user: AuthUserDto;
  tokens: AuthTokensDto;
  isNewUser: boolean;
}

export interface UpdateUserProfileDto {
  name?: string;
  email?: string;
  phoneNumber?: string;
  age?: number;
  gender?: string;
}

export interface ChangePasswordDto {
  currentPassword?: string;
  newPassword: string;
}

