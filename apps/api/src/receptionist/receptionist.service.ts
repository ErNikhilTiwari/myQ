import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueuesService } from '../queues/queues.service';
import {
  WalkInRegistrationDto,
  WalkInResultDto,
  ReceptionistDailyStatsDto,
  UserRole,
} from '@queueapp/shared';

@Injectable()
export class ReceptionistService {
  private readonly logger = new Logger(ReceptionistService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queuesService: QueuesService,
  ) {}

  /**
   * Register a walk-in patient and issue queue token in one flow
   */
  async registerWalkIn(
    clinicId: string,
    dto: WalkInRegistrationDto,
  ): Promise<WalkInResultDto> {
    let cleanPhone = dto.phoneNumber.trim().replace(/[\s-]/g, '');
    if (!cleanPhone.startsWith('+')) {
      if (cleanPhone.length === 10) {
        cleanPhone = `+91${cleanPhone}`;
      } else {
        throw new BadRequestException('Invalid phone number format. Provide 10-digit number or with +91 prefix.');
      }
    }

    // 1. Find or create patient user
    let user = await this.prisma.user.findUnique({
      where: { phoneNumber: cleanPhone },
    });

    let isExistingPatient = true;

    if (!user) {
      isExistingPatient = false;
      user = await this.prisma.user.create({
        data: {
          phoneNumber: cleanPhone,
          name: dto.name.trim(),
          role: UserRole.PATIENT,
          patientProfile: {
            create: {},
          },
        },
      });
      this.logger.log(`👤 Created new walk-in patient: ${user.name} (${cleanPhone})`);
    }

    // 2. Issue Token in requested queue
    const entry = await this.queuesService.issueToken(clinicId, dto.queueId, {
      userId: user.id,
      tokenPrefix: dto.tokenPrefix || 'W',
      notes: dto.notes,
    });

    return {
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        role: user.role as UserRole,
      },
      entry: entry as any,
      isExistingPatient,
    };
  }

  /**
   * Daily aggregated metrics for Receptionist Dashboard
   */
  async getDailyStats(clinicId: string): Promise<ReceptionistDailyStatsDto> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const entries = await this.prisma.queueEntry.findMany({
      where: {
        queue: { clinicId },
        createdAt: { gte: startOfDay },
      },
      select: {
        id: true,
        status: true,
        tokenNumber: true,
        createdAt: true,
        completedAt: true,
      },
    });

    const waitingCount = entries.filter((e) => e.status === 'WAITING').length;
    const calledCount = entries.filter((e) => e.status === 'CALLED' || e.status === 'IN_SERVICE').length;
    const onHoldCount = entries.filter((e) => e.status === 'ON_HOLD').length;
    const skippedCount = entries.filter((e) => e.status === 'SKIPPED').length;
    const completedCount = entries.filter((e) => e.status === 'COMPLETED').length;

    // Calculate average wait time for completed visits today
    const completedEntries = entries.filter((e) => e.status === 'COMPLETED' && e.completedAt);
    let avgWaitMinutes = 15; // default fallback

    if (completedEntries.length > 0) {
      const totalWaitMs = completedEntries.reduce((acc, curr) => {
        const wait = curr.completedAt!.getTime() - curr.createdAt.getTime();
        return acc + Math.max(0, wait);
      }, 0);
      avgWaitMinutes = Math.round(totalWaitMs / (completedEntries.length * 60 * 1000));
    }

    const currentServing = entries.find((e) => e.status === 'CALLED' || e.status === 'IN_SERVICE');

    return {
      totalTokensToday: entries.length,
      waitingCount,
      calledCount,
      onHoldCount,
      skippedCount,
      completedCount,
      avgWaitMinutes,
      currentServingToken: currentServing?.tokenNumber || null,
    };
  }

  /**
   * Patient lookup for walk-in autocomplete
   */
  async searchPatients(query: string) {
    if (!query || query.length < 3) return [];

    return this.prisma.user.findMany({
      where: {
        role: UserRole.PATIENT,
        OR: [
          { name: { contains: query } },
          { phoneNumber: { contains: query } },
        ],
      },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
      },
      take: 10,
    });
  }
}
