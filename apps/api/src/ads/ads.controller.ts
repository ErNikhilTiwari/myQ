import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdsService } from './ads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CreateAdDto,
  RecordAdImpressionDto,
  RecordAdClickDto,
  AdPlacement,
  UserRole,
  ApiResponse,
} from '@queueapp/shared';

@Controller('api')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  /**
   * 1. Public: Get active advertisement for placement (e.g. TV_VIEWER_BOTTOM)
   */
  @Get('ads/:placement')
  async getAd(
    @Param('placement') placement: AdPlacement,
    @Query('clinicId') clinicId?: string,
  ): Promise<ApiResponse> {
    const data = await this.adsService.getActiveAd(placement, clinicId);
    return { success: true, data };
  }

  /**
   * 2. Public: Record ad impression beacon
   */
  @Post('ads/:id/impression')
  @HttpCode(HttpStatus.OK)
  async recordImpression(
    @Param('id') id: string,
    @Body() dto: RecordAdImpressionDto,
  ): Promise<ApiResponse> {
    const data = await this.adsService.recordImpression(id, dto);
    return { success: true, data };
  }

  /**
   * 3. Public: Record ad click beacon
   */
  @Post('ads/:id/click')
  @HttpCode(HttpStatus.OK)
  async recordClick(
    @Param('id') id: string,
    @Body() dto: RecordAdClickDto,
  ): Promise<ApiResponse> {
    const data = await this.adsService.recordClick(id, dto);
    return { success: true, data };
  }

  /**
   * 4. Super Admin: Create new ad campaign
   */
  @Post('super/ads')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async createAd(@Body() dto: CreateAdDto): Promise<ApiResponse> {
    const data = await this.adsService.createAd(dto);
    return { success: true, data };
  }

  /**
   * 5. Super Admin: List all ads
   */
  @Get('super/ads')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async listAds(): Promise<ApiResponse> {
    const data = await this.adsService.listAds();
    return { success: true, data };
  }
}
