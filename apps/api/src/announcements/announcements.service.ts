import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
  AnnouncementDto,
  ActiveAnnouncementDto,
  VoiceCalloutDto,
  AnnouncementType,
  AnnouncementPriority,
  AnnouncementDisplayMode,
  AnnouncementAudioMode,
  AnnouncementStatus,
} from '@queueapp/shared';

@Injectable()
export class AnnouncementsService {
  private readonly logger = new Logger(AnnouncementsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an announcement (Doctor delay, Closure, Notice, Health Tip)
   */
  async createAnnouncement(
    clinicId: string,
    dto: CreateAnnouncementDto,
  ): Promise<AnnouncementDto> {
    const announcement = await this.prisma.announcement.create({
      data: {
        clinicId,
        title: dto.title,
        messageEn: dto.messageEn,
        messageHi: dto.messageHi || null,
        type: dto.type,
        priority: dto.priority || 'NORMAL',
        displayMode: dto.displayMode || 'TICKER',
        audioMode: dto.audioMode || 'NONE',
        status: 'ACTIVE',
        queueId: dto.queueId || null,
        displayDeviceId: dto.displayDeviceId || null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    this.logger.log(`📢 Created Announcement: "${announcement.title}" (${announcement.displayMode}) for Clinic "${clinicId}"`);

    return this.mapToDto(announcement);
  }

  /**
   * Staff lists all announcements for clinic
   */
  async listAnnouncements(clinicId: string): Promise<AnnouncementDto[]> {
    const list = await this.prisma.announcement.findMany({
      where: { clinicId },
      orderBy: { createdAt: 'desc' },
    });

    return list.map((a) => this.mapToDto(a));
  }

  /**
   * Public active announcements for TV displays and patient mobile pages
   */
  async getActiveAnnouncements(
    clinicId: string,
    displayDeviceId?: string,
    queueId?: string,
  ): Promise<ActiveAnnouncementDto[]> {
    const now = new Date();

    const where: any = {
      clinicId,
      status: 'ACTIVE',
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    };

    if (displayDeviceId) {
      where.AND = [
        { OR: [{ displayDeviceId: null }, { displayDeviceId }] },
      ];
    }

    if (queueId) {
      where.AND = [
        ...(where.AND || []),
        { OR: [{ queueId: null }, { queueId }] },
      ];
    }

    const activeList = await this.prisma.announcement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const PRIORITY_WEIGHTS: Record<string, number> = {
      CRITICAL: 4,
      HIGH: 3,
      NORMAL: 2,
      LOW: 1,
    };

    activeList.sort((a, b) => {
      const weightA = PRIORITY_WEIGHTS[a.priority] || 0;
      const weightB = PRIORITY_WEIGHTS[b.priority] || 0;
      if (weightB !== weightA) return weightB - weightA;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    return activeList.map((a) => ({
      id: a.id,
      title: a.title,
      messageEn: a.messageEn,
      messageHi: a.messageHi,
      type: a.type as AnnouncementType,
      priority: a.priority as AnnouncementPriority,
      displayMode: a.displayMode as AnnouncementDisplayMode,
      audioMode: a.audioMode as AnnouncementAudioMode,
      expiresAt: a.expiresAt ? a.expiresAt.toISOString() : null,
    }));
  }

  /**
   * Emergency Full-Screen Takeover (Highest Priority)
   */
  async createEmergencyTakeover(
    clinicId: string,
    title: string,
    messageEn: string,
    messageHi?: string,
  ): Promise<AnnouncementDto> {
    const oneHourExpiry = new Date(Date.now() + 60 * 60 * 1000);

    const emergency = await this.prisma.announcement.create({
      data: {
        clinicId,
        title: `🚨 EMERGENCY: ${title}`,
        messageEn,
        messageHi: messageHi || 'तत्काल सूचना: कृपया प्रतीक्षा कक्ष खाली करें',
        type: 'EMERGENCY',
        priority: 'CRITICAL',
        displayMode: 'FULLSCREEN_TAKEOVER',
        audioMode: 'VOICE',
        status: 'ACTIVE',
        expiresAt: oneHourExpiry,
      },
    });

    this.logger.warn(`🚨 EMERGENCY TAKEOVER TRIGGERED for Clinic "${clinicId}": "${title}"`);

    return this.mapToDto(emergency);
  }

  /**
   * Dual Voice Callout Generator (English + Hindi, approved ADR-008)
   */
  generateVoiceCallout(
    tokenNumber: string,
    roomNumber?: string,
    doctorName?: string,
  ): VoiceCalloutDto {
    const roomStrEn = roomNumber ? `Room ${roomNumber}` : 'the consultation room';
    const docStrEn = doctorName ? `, with Dr. ${doctorName}` : '';
    const englishSpeech = `Token ${tokenNumber}, please proceed to ${roomStrEn}${docStrEn}.`;

    const roomStrHi = roomNumber ? `कमरा नंबर ${roomNumber}` : 'परामर्श कक्ष';
    const docStrHi = doctorName ? `, डॉ. ${doctorName} के पास` : '';
    const hindiSpeech = `टोकन ${tokenNumber}, कृपया ${roomStrHi}${docStrHi} जाएं।`;

    return {
      tokenNumber,
      roomNumber: roomNumber || null,
      doctorName: doctorName || null,
      englishSpeech,
      hindiSpeech,
    };
  }

  /**
   * Update announcement status or content
   */
  async updateAnnouncement(
    clinicId: string,
    id: string,
    dto: UpdateAnnouncementDto,
  ): Promise<AnnouncementDto> {
    const existing = await this.prisma.announcement.findFirst({
      where: { id, clinicId },
    });

    if (!existing) {
      throw new NotFoundException(`Announcement "${id}" not found in clinic "${clinicId}".`);
    }

    const updated = await this.prisma.announcement.update({
      where: { id },
      data: {
        title: dto.title,
        messageEn: dto.messageEn,
        messageHi: dto.messageHi,
        type: dto.type,
        priority: dto.priority,
        displayMode: dto.displayMode,
        audioMode: dto.audioMode,
        status: dto.status,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });

    return this.mapToDto(updated);
  }

  /**
   * Archive announcement
   */
  async archiveAnnouncement(clinicId: string, id: string) {
    const existing = await this.prisma.announcement.findFirst({
      where: { id, clinicId },
    });

    if (!existing) {
      throw new NotFoundException(`Announcement "${id}" not found in clinic "${clinicId}".`);
    }

    return this.prisma.announcement.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
  }

  private mapToDto(a: any): AnnouncementDto {
    return {
      id: a.id,
      clinicId: a.clinicId,
      title: a.title,
      messageEn: a.messageEn,
      messageHi: a.messageHi,
      type: a.type as AnnouncementType,
      priority: a.priority as AnnouncementPriority,
      displayMode: a.displayMode as AnnouncementDisplayMode,
      audioMode: a.audioMode as AnnouncementAudioMode,
      status: a.status as AnnouncementStatus,
      queueId: a.queueId,
      displayDeviceId: a.displayDeviceId,
      expiresAt: a.expiresAt?.toISOString() || null,
      createdAt: a.createdAt.toISOString(),
    };
  }
}
