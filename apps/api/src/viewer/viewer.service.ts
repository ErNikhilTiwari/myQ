import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateDisplayDeviceDto,
  DisplayDeviceDto,
  ViewerSnapshotDto,
  DisplayTemplate,
} from '@queueapp/shared';

@Injectable()
export class ViewerService {
  private readonly logger = new Logger(ViewerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Admin provisions a new display screen / TV
   */
  async createDevice(
    clinicId: string,
    dto: CreateDisplayDeviceDto,
  ): Promise<DisplayDeviceDto> {
    const displayToken = `dt_${crypto.randomBytes(16).toString('hex')}`;

    const device = await this.prisma.displayDevice.create({
      data: {
        clinicId,
        name: dto.name,
        displayToken,
        template: dto.template || 'NOW_SERVING_NEXT',
        soundEnabled: dto.soundEnabled ?? true,
      },
    });

    this.logger.log(`📺 Registered Display TV "${device.name}" for Clinic "${clinicId}"`);

    return {
      id: device.id,
      clinicId: device.clinicId,
      name: device.name,
      displayToken: device.displayToken,
      template: device.template as DisplayTemplate,
      soundEnabled: device.soundEnabled,
      lastHeartbeatAt: device.lastHeartbeatAt?.toISOString() || null,
      isOnline: false,
      createdAt: device.createdAt.toISOString(),
    };
  }

  /**
   * Admin lists configured TV display devices with online heartbeat status
   */
  async listDevices(clinicId: string): Promise<DisplayDeviceDto[]> {
    const devices = await this.prisma.displayDevice.findMany({
      where: { clinicId },
      orderBy: { createdAt: 'desc' },
    });

    const now = Date.now();
    const SIXTY_SECONDS = 60 * 1000;

    return devices.map((d) => {
      const isOnline = d.lastHeartbeatAt
        ? now - d.lastHeartbeatAt.getTime() < SIXTY_SECONDS
        : false;

      return {
        id: d.id,
        clinicId: d.clinicId,
        name: d.name,
        displayToken: d.displayToken,
        template: d.template as DisplayTemplate,
        soundEnabled: d.soundEnabled,
        lastHeartbeatAt: d.lastHeartbeatAt?.toISOString() || null,
        isOnline,
        createdAt: d.createdAt.toISOString(),
      };
    });
  }

  /**
   * TV Display Screen polls for current state snapshot (zero auth required)
   */
  async getSnapshot(displayToken: string): Promise<ViewerSnapshotDto> {
    const device = await this.prisma.displayDevice.findUnique({
      where: { displayToken },
      include: { clinic: true },
    });

    if (!device) {
      throw new NotFoundException('Display device not found. Please verify display token.');
    }

    const clinicId = device.clinicId;

    // 1. Fetch currently serving tokens (CALLED or IN_SERVICE)
    const activeServing = await this.prisma.queueEntry.findMany({
      where: {
        queue: { clinicId },
        status: { in: ['CALLED', 'IN_SERVICE'] },
      },
      include: {
        queue: {
          include: {
            doctor: true,
          },
        },
      },
      orderBy: { calledAt: 'desc' },
    });

    const current = activeServing[0] || null;

    // 2. Fetch last 4 recently called tokens for Template 2 (LAST_4_CALLED)
    const recentCalledEntries = await this.prisma.queueEntry.findMany({
      where: {
        queue: { clinicId },
        status: { in: ['CALLED', 'IN_SERVICE', 'COMPLETED'] },
        calledAt: { not: null },
      },
      include: {
        queue: {
          include: {
            doctor: true,
          },
        },
      },
      orderBy: { calledAt: 'desc' },
      take: 4,
    });

    // 3. Fetch next 6 waiting patients
    const nextWaitingEntries = await this.prisma.queueEntry.findMany({
      where: {
        queue: { clinicId },
        status: 'WAITING',
      },
      orderBy: { sequenceNumber: 'asc' },
      take: 6,
    });

    const activeQueuesCount = await this.prisma.queue.count({
      where: { clinicId, isPaused: false },
    });

    return {
      clinicName: device.clinic.name,
      template: device.template as DisplayTemplate,
      soundEnabled: device.soundEnabled,
      currentServing: current
        ? {
            tokenNumber: current.tokenNumber,
            roomNumber: current.queue.doctor?.roomNumber || null,
            doctorName: current.queue.doctor?.name || null,
            calledAt: current.calledAt ? current.calledAt.toISOString() : null,
          }
        : null,
      recentCalled: recentCalledEntries.map((e) => ({
        tokenNumber: e.tokenNumber,
        roomNumber: e.queue.doctor?.roomNumber || null,
        doctorName: e.queue.doctor?.name || null,
        calledAt: e.calledAt ? e.calledAt.toISOString() : null,
      })),
      nextWaiting: nextWaitingEntries.map((e, idx) => ({
        tokenNumber: e.tokenNumber,
        estimatedWaitMinutes: (idx + 1) * 15,
      })),
      activeQueuesCount,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * TV Heartbeat ping (called every 30s by TV browser)
   */
  async recordHeartbeat(displayToken: string) {
    const device = await this.prisma.displayDevice.findUnique({
      where: { displayToken },
    });

    if (!device) {
      throw new NotFoundException('Display token not found.');
    }

    await this.prisma.displayDevice.update({
      where: { displayToken },
      data: { lastHeartbeatAt: new Date() },
    });

    return { status: 'heartbeat_acknowledged', timestamp: new Date().toISOString() };
  }
}
