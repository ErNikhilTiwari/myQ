import { Controller, Post, Body, Get, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  ApiResponse,
} from '@queueapp/shared';
import { SendOtpDto, VerifyOtpDto, RefreshTokenDto, LoginPasswordDto, UpdateProfileDto, ChangePasswordDto } from './dto/auth.dto';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  async sendOtp(@Body() dto: SendOtpDto): Promise<ApiResponse> {
    const data = await this.authService.sendOtp(dto);
    return {
      success: true,
      data,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: VerifyOtpDto): Promise<ApiResponse> {
    const data = await this.authService.verifyOtp(dto);
    return {
      success: true,
      data,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Post('login-password')
  @HttpCode(HttpStatus.OK)
  async loginWithPassword(@Body() dto: LoginPasswordDto): Promise<ApiResponse> {
    const data = await this.authService.loginWithPassword(dto);
    return {
      success: true,
      data,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() dto: RefreshTokenDto): Promise<ApiResponse> {
    const data = await this.authService.refreshToken(dto);
    return {
      success: true,
      data,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: any): Promise<ApiResponse> {
    return {
      success: true,
      data: req.user,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Post('profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto): Promise<ApiResponse> {
    const data = await this.authService.updateProfile(req.user.id, dto);
    return {
      success: true,
      data,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(@Req() req: any, @Body() dto: ChangePasswordDto): Promise<ApiResponse> {
    const data = await this.authService.changePassword(req.user.id, dto);
    return {
      success: true,
      data,
      meta: { timestamp: new Date().toISOString() },
    };
  }
}
