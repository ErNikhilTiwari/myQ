import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { QueueStateMachine } from './queue-state-machine';
import {
  CreateQueueDto,
  IssueTokenDto,
  QueueEntryStatus,
  QueueTransitionDto,
  CallNextResultDto,
  PublicTokenStatusDto,
} from '@queueapp/shared';

@Injectable()
export class QueuesService {
  private readonly logger = new Logger(QueuesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new queue in a clinic
   */
  async createQueue(clinicId: string, dto: CreateQueueDto) {
    return this.prisma.queue.create({
      data: {
        clinicId,
        name: dto.name,
        doctorId: dto.doctorId || null,
        serviceId: dto.serviceId || null,
      },
      include: {
        doctor: true,
        service: true,
      },
    });
  }

  /**
   * List all queues for a clinic with active count and current serving token
   */
  async getClinicQueues(clinicId: string) {
    const queues = await this.prisma.queue.findMany({
      where: { clinicId },
      include: {
        doctor: true,
        service: true,
        queueEntries: {
          where: {
            status: { in: ['WAITING', 'CALLED', 'IN_SERVICE', 'ON_HOLD'] },
          },
          orderBy: { sequenceNumber: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return queues.map((q) => {
      const currentServing = q.queueEntries.find(
        (e) => e.status === 'CALLED' || e.status === 'IN_SERVICE',
      );
      const waitingCount = q.queueEntries.filter((e) => e.status === 'WAITING').length;

      return {
        id: q.id,
        clinicId: q.clinicId,
        name: q.name,
        doctorId: q.doctorId,
        doctorName: q.doctor?.name || null,
        serviceId: q.serviceId,
        serviceName: q.service?.name || null,
        isPaused: q.isPaused,
        currentSeq: q.currentSeq,
        waitingCount,
        activeCount: q.queueEntries.length,
        currentServingToken: currentServing?.tokenNumber || null,
        createdAt: q.createdAt.toISOString(),
      };
    });
  }

  /**
   * Get queue details with partitioned lists for receptionist dashboard
   */
  async getQueueDetails(clinicId: string, queueId: string) {
    const queue = await this.prisma.queue.findFirst({
      where: { id: queueId, clinicId },
      include: {
        doctor: true,
        service: true,
        queueEntries: {
          include: {
            user: { select: { id: true, name: true, phoneNumber: true } },
          },
          orderBy: { sequenceNumber: 'asc' },
        },
      },
    });

    if (!queue) {
      throw new NotFoundException(`Queue "${queueId}" not found in clinic "${clinicId}".`);
    }

    const currentServing = queue.queueEntries.find(
      (e) => e.status === 'CALLED' || e.status === 'IN_SERVICE',
    );
    const waiting = queue.queueEntries.filter((e) => e.status === 'WAITING');
    const booked = queue.queueEntries.filter((e) => e.status === 'BOOKED');
    const onHold = queue.queueEntries.filter((e) => e.status === 'ON_HOLD');
    const skipped = queue.queueEntries.filter((e) => e.status === 'SKIPPED');
    const completed = queue.queueEntries.filter((e) => e.status === 'COMPLETED');

    const mapEntry = (e: any) => ({
      ...e,
      patientName: e.user?.name || 'Walk-in Patient',
      phoneNumber: e.user?.phoneNumber || '',
    });

    return {
      queue: {
        id: queue.id,
        name: queue.name,
        clinicId: queue.clinicId,
        isPaused: queue.isPaused,
        currentSeq: queue.currentSeq,
        doctor: queue.doctor,
        service: queue.service,
      },
      currentServing: currentServing ? mapEntry(currentServing) : null,
      waiting: waiting.map(mapEntry),
      booked: booked.map(mapEntry),
      onHold: onHold.map(mapEntry),
      skipped: skipped.map(mapEntry),
      completed: completed.map(mapEntry),
      completedCount: completed.length,
      totalToday: queue.queueEntries.length,
    };
  }

  /**
   * Concurrency-safe atomic token generation
   */
  async issueToken(clinicId: string, queueId: string, dto: IssueTokenDto) {
    const prefix = dto.tokenPrefix || 'A';

    return this.prisma.$transaction(async (tx) => {
      // 1. Assert queue belongs to clinic and is not paused
      const queue = await tx.queue.findFirst({
        where: { id: queueId, clinicId },
      });

      if (!queue) {
        throw new NotFoundException(`Queue "${queueId}" not found in clinic "${clinicId}".`);
      }

      if (queue.isPaused) {
        throw new BadRequestException('Cannot issue token: This queue is currently paused.');
      }

      // 2. Atomic sequence increment
      const updatedQueue = await tx.queue.update({
        where: { id: queueId },
        data: { currentSeq: { increment: 1 } },
      });

      const seq = updatedQueue.currentSeq;
      const tokenNumber = `${prefix}${String(seq).padStart(2, '0')}`;
      const publicToken = `qt_${crypto.randomBytes(16).toString('hex')}`;

      // 3. Calculate initial estimated wait time
      const peopleAhead = await tx.queueEntry.count({
        where: { queueId, status: 'WAITING' },
      });
      const estimatedWait = peopleAhead * 15; // default 15 min per patient

      // 4. Create QueueEntry
      const entry = await tx.queueEntry.create({
        data: {
          queueId,
          userId: dto.userId,
          tokenNumber,
          sequenceNumber: seq,
          status: QueueEntryStatus.WAITING,
          publicToken,
          estimatedWait,
        },
        include: {
          user: { select: { id: true, name: true, phoneNumber: true } },
        },
      });

      this.logger.log(`🎟️ Issued Token ${tokenNumber} (Seq ${seq}) for Queue "${queue.name}"`);
      return entry;
    });
  }

  /**
   * Concurrency-safe "Call Next" patient
   */
  async callNext(clinicId: string, queueId: string): Promise<CallNextResultDto> {
    return this.prisma.$transaction(async (tx) => {
      const queue = await tx.queue.findFirst({
        where: { id: queueId, clinicId },
      });

      if (!queue) {
        throw new NotFoundException(`Queue "${queueId}" not found in clinic "${clinicId}".`);
      }

      if (queue.isPaused) {
        throw new BadRequestException('Queue is paused. Please resume queue before calling next patient.');
      }

      // Automatically complete all tokens currently in CALLED or IN_SERVICE
      const servingEntries = await tx.queueEntry.findMany({
        where: {
          queueId,
          status: { in: [QueueEntryStatus.CALLED, QueueEntryStatus.IN_SERVICE] },
        },
      });

      let previousCompleted = false;
      if (servingEntries.length > 0) {
        await tx.queueEntry.updateMany({
          where: {
            id: { in: servingEntries.map((e) => e.id) },
          },
          data: {
            status: QueueEntryStatus.COMPLETED,
            completedAt: new Date(),
          },
        });
        previousCompleted = true;
        this.logger.log(
          `✅ Auto-completed previous patient(s) (${servingEntries.map((e) => e.tokenNumber).join(', ')}) upon calling next patient.`
        );
      }

      // Find the next waiting patient in order of sequence
      const nextEntry = await tx.queueEntry.findFirst({
        where: { queueId, status: QueueEntryStatus.WAITING },
        orderBy: { sequenceNumber: 'asc' },
        include: {
          user: { select: { id: true, name: true, phoneNumber: true } },
        },
      });

      if (!nextEntry) {
        return {
          calledEntry: null,
          previousEntryCompleted: previousCompleted,
          message: 'Queue is clear. No patients waiting.',
        };
      }

      // Transition to CALLED
      const calledEntry = await tx.queueEntry.update({
        where: { id: nextEntry.id },
        data: {
          status: QueueEntryStatus.CALLED,
          calledAt: new Date(),
        },
        include: {
          user: { select: { id: true, name: true, phoneNumber: true } },
        },
      });

      this.logger.log(`📢 Called Next: Token ${calledEntry.tokenNumber} in Queue "${queue.name}"`);

      return {
        calledEntry: calledEntry as any,
        previousEntryCompleted: previousCompleted,
        message: `Token ${calledEntry.tokenNumber} called successfully.`,
      };
    });
  }

  /**
   * State Machine Transition (Skip, Hold, Complete, Cancel, Recall)
   */
  async transitionEntry(clinicId: string, entryId: string, dto: QueueTransitionDto) {
    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.queueEntry.findUnique({
        where: { id: entryId },
        include: { queue: true },
      });

      if (!entry || entry.queue.clinicId !== clinicId) {
        throw new NotFoundException(`Queue entry "${entryId}" not found in clinic "${clinicId}".`);
      }

      // Validate transition via state machine rules
      QueueStateMachine.validateTransition(
        entry.status as QueueEntryStatus,
        dto.targetStatus,
      );

      const updateData: any = { status: dto.targetStatus };

      if (dto.targetStatus === QueueEntryStatus.ON_HOLD) {
        updateData.holdReason = dto.holdReason || 'Put on hold by receptionist';
      }

      if (dto.targetStatus === QueueEntryStatus.CALLED) {
        updateData.calledAt = new Date();
      }

      if (dto.targetStatus === QueueEntryStatus.IN_SERVICE) {
        updateData.startedAt = new Date();
      }

      if (
        dto.targetStatus === QueueEntryStatus.COMPLETED ||
        dto.targetStatus === QueueEntryStatus.NO_SHOW ||
        dto.targetStatus === QueueEntryStatus.CANCELLED
      ) {
        updateData.completedAt = new Date();
      }

      if (dto.targetStatus === QueueEntryStatus.CANCELLED) {
        updateData.holdReason = dto.holdReason || (dto as any).reason || 'Cancelled by staff';
      }

      return tx.queueEntry.update({
        where: { id: entryId },
        data: updateData,
      });
    });
  }

  /**
   * Pause / Resume Queue
   */
  async toggleQueuePause(clinicId: string, queueId: string, isPaused: boolean) {
    const queue = await this.prisma.queue.findFirst({
      where: { id: queueId, clinicId },
    });

    if (!queue) {
      throw new NotFoundException(`Queue "${queueId}" not found in clinic "${clinicId}".`);
    }

    return this.prisma.queue.update({
      where: { id: queueId },
      data: { isPaused },
    });
  }

  /**
   * Public, non-login token status lookup via non-guessable publicToken
   */
  async getPublicTokenStatus(publicToken: string): Promise<PublicTokenStatusDto> {
    const entry = await this.prisma.queueEntry.findUnique({
      where: { publicToken },
      include: {
        queue: {
          include: {
            clinic: true,
            doctor: true,
          },
        },
      },
    });

    if (!entry) {
      throw new NotFoundException('Token not found. Please verify your queue link or token.');
    }

    // Calculate how many people ahead
    const positionAhead = await this.prisma.queueEntry.count({
      where: {
        queueId: entry.queueId,
        status: QueueEntryStatus.WAITING,
        sequenceNumber: { lt: entry.sequenceNumber },
      },
    });

    // Find current serving token
    const currentServing = await this.prisma.queueEntry.findFirst({
      where: {
        queueId: entry.queueId,
        status: { in: [QueueEntryStatus.CALLED, QueueEntryStatus.IN_SERVICE] },
      },
      orderBy: { sequenceNumber: 'asc' },
    });

    // Dynamic Rolling ETA Algorithm (Phase 2, Section 30 & 11):
    // Computes dynamic average consultation duration from completed tokens for this doctor/queue
    let estimatedWaitMinutes = 0;
    if (entry.status === QueueEntryStatus.WAITING) {
      estimatedWaitMinutes = await this.calculateDynamicETA(
        entry.queueId,
        entry.queue.doctorId,
        positionAhead,
      );
    }

    return {
      tokenNumber: entry.tokenNumber,
      status: entry.status as QueueEntryStatus,
      clinicName: entry.queue.clinic.name,
      queueName: entry.queue.name,
      doctorName: entry.queue.doctor?.name || null,
      currentServingToken: currentServing?.tokenNumber || null,
      positionAhead: entry.status === QueueEntryStatus.WAITING ? positionAhead : 0,
      estimatedWaitMinutes,
      holdReason: entry.holdReason,
      calledAt: entry.calledAt ? entry.calledAt.toISOString() : null,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Phase 2 Dynamic ETA Algorithm (rolling completed consultation history)
   */
  async calculateDynamicETA(
    queueId: string,
    doctorId: string | null,
    peopleAhead: number,
  ): Promise<number> {
    if (peopleAhead <= 0) return 0;

    // Look for completed tokens in this queue/doctor with valid service durations
    const completedTokens = await this.prisma.queueEntry.findMany({
      where: {
        queueId,
        status: QueueEntryStatus.COMPLETED,
        startedAt: { not: null },
        completedAt: { not: null },
      },
      take: 10,
      orderBy: { completedAt: 'desc' },
    });

    let avgMinutes = 15; // default fallback
    if (completedTokens.length > 0) {
      let totalDurationMs = 0;
      let validCount = 0;

      for (const t of completedTokens) {
        if (t.startedAt && t.completedAt) {
          const dur = t.completedAt.getTime() - t.startedAt.getTime();
          if (dur > 0 && dur < 120 * 60 * 1000) { // filter out outliers > 2 hrs
            totalDurationMs += dur;
            validCount++;
          }
        }
      }

      if (validCount > 0) {
        avgMinutes = Math.max(5, Math.round(totalDurationMs / validCount / (1000 * 60)));
      }
    }

    return peopleAhead * avgMinutes;
  }

  /**
   * Manual token lookup by clinicSlug and tokenNumber (zero auth required)
   */
  async lookupToken(clinicSlug: string, tokenNumber: string): Promise<PublicTokenStatusDto> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { slug: clinicSlug },
    });

    if (!clinic) {
      throw new NotFoundException(`Clinic "${clinicSlug}" not found.`);
    }

    const cleanToken = tokenNumber.trim().toUpperCase();
    const tokenNoHyphen = cleanToken.replace(/-/g, '');
    const tokenWithHyphen = cleanToken.includes('-')
      ? cleanToken
      : cleanToken.replace(/^([A-Za-z]+)(\d+)$/, '$1-$2');

    const entry = await this.prisma.queueEntry.findFirst({
      where: {
        queue: { clinicId: clinic.id },
        tokenNumber: { in: [cleanToken, tokenNoHyphen, tokenWithHyphen] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!entry) {
      throw new NotFoundException(
        `Token "${cleanToken}" not found in clinic "${clinic.name}". Please check the token number.`,
      );
    }

    return this.getPublicTokenStatus(entry.publicToken);
  }
}
