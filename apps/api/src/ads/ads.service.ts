import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAdDto,
  AdDto,
  RecordAdImpressionDto,
  RecordAdClickDto,
  AdPlacement,
} from '@queueapp/shared';

@Injectable()
export class AdsService {
  private readonly logger = new Logger(AdsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Super Admin creates advertisement campaign slot
   */
  async createAd(dto: CreateAdDto): Promise<AdDto> {
    const ad = await this.prisma.advertisement.create({
      data: {
        title: dto.title,
        imageUrl: dto.imageUrl,
        targetUrl: dto.targetUrl || null,
        placement: dto.placement,
        clinicId: dto.clinicId || null,
        isActive: true,
      },
      include: {
        _count: {
          select: { impressions: true, clicks: true },
        },
      },
    });

    this.logger.log(`📢 Created Ad "${ad.title}" for Placement ${ad.placement}`);
    return this.mapToDto(ad);
  }

  /**
   * Public: Get active advertisement for placement (Zero auth, fail-safe)
   */
  async getActiveAd(
    placement: AdPlacement,
    clinicId?: string,
  ): Promise<AdDto | null> {
    const where: any = {
      placement,
      isActive: true,
    };

    if (clinicId) {
      where.OR = [{ clinicId: null }, { clinicId }];
    } else {
      where.clinicId = null;
    }

    const ads = await this.prisma.advertisement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { impressions: true, clicks: true },
        },
      },
    });

    if (ads.length === 0) {
      return null;
    }

    // Pick first or random active ad
    const selectedAd = ads[0];
    return this.mapToDto(selectedAd);
  }

  /**
   * Record Impression (Beacon endpoint)
   */
  async recordImpression(
    adId: string,
    dto: RecordAdImpressionDto,
  ): Promise<{ success: boolean; recorded: boolean }> {
    const ad = await this.prisma.advertisement.findUnique({
      where: { id: adId },
    });

    if (!ad) {
      throw new NotFoundException(`Ad with ID "${adId}" not found.`);
    }

    await this.prisma.adImpression.create({
      data: {
        adId,
        clinicId: dto.clinicId || null,
        deviceType: dto.deviceType || 'TV',
      },
    });

    return { success: true, recorded: true };
  }

  /**
   * Record Click (Beacon / interaction endpoint)
   */
  async recordClick(
    adId: string,
    dto: RecordAdClickDto,
  ): Promise<{ success: boolean; targetUrl: string | null }> {
    const ad = await this.prisma.advertisement.findUnique({
      where: { id: adId },
    });

    if (!ad) {
      throw new NotFoundException(`Ad with ID "${adId}" not found.`);
    }

    await this.prisma.adClick.create({
      data: {
        adId,
        clinicId: dto.clinicId || null,
        deviceType: dto.deviceType || 'MOBILE',
      },
    });

    return { success: true, targetUrl: ad.targetUrl };
  }

  /**
   * Super Admin lists all ads with analytics
   */
  async listAds(): Promise<AdDto[]> {
    const ads = await this.prisma.advertisement.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { impressions: true, clicks: true },
        },
      },
    });

    return ads.map((a) => this.mapToDto(a));
  }

  private mapToDto(a: any): AdDto {
    return {
      id: a.id,
      title: a.title,
      imageUrl: a.imageUrl,
      targetUrl: a.targetUrl,
      placement: a.placement as AdPlacement,
      clinicId: a.clinicId,
      isActive: a.isActive,
      impressionsCount: a._count?.impressions || 0,
      clicksCount: a._count?.clicks || 0,
      createdAt: a.createdAt.toISOString(),
    };
  }
}
