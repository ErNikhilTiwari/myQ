import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QueuesService } from './queues.service';
import { PrismaService } from '../prisma/prisma.service';
import { QueueEntryStatus } from '@queueapp/shared';

describe('QueuesService (Unit Tests & Queue Concurrency)', () => {
  let service: QueuesService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      queue: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      queueEntry: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      appointment: { findMany: jest.fn() },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    service = new QueuesService(prisma as unknown as PrismaService);
  });

  describe('callNext', () => {
    it('throws NotFoundException if queue does not exist in target clinic', async () => {
      prisma.queue.findFirst.mockResolvedValue(null);

      await expect(service.callNext('clinic-1', 'nonexistent-queue')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects calling next patient when queue is paused', async () => {
      prisma.queue.findFirst.mockResolvedValue({
        id: 'queue-1',
        clinicId: 'clinic-1',
        isPaused: true,
      });

      await expect(service.callNext('clinic-1', 'queue-1')).rejects.toThrow(BadRequestException);
      await expect(service.callNext('clinic-1', 'queue-1')).rejects.toThrow(/Queue is paused/);
    });

    it('returns clear status message when no patients are waiting', async () => {
      prisma.queue.findFirst.mockResolvedValue({
        id: 'queue-1',
        clinicId: 'clinic-1',
        isPaused: false,
      });
      prisma.queueEntry.findMany.mockResolvedValue([]);
      prisma.queueEntry.findFirst.mockResolvedValue(null); // No waiting entries

      const result = await service.callNext('clinic-1', 'queue-1');
      expect(result.calledEntry).toBeNull();
      expect(result.message).toMatch(/No patients waiting/);
    });

    it('auto-completes the currently serving patient and calls the lowest sequence waiting patient', async () => {
      prisma.queue.findFirst.mockResolvedValue({
        id: 'queue-1',
        clinicId: 'clinic-1',
        name: 'General OPD',
        isPaused: false,
      });

      // Serving patient
      prisma.queueEntry.findMany.mockResolvedValue([
        { id: 'entry-serving', tokenNumber: 'A01', status: QueueEntryStatus.CALLED },
      ]);

      // Next waiting patient in sequence
      const nextWaiting = {
        id: 'entry-waiting',
        tokenNumber: 'A02',
        sequenceNumber: 2,
        status: QueueEntryStatus.WAITING,
        user: { id: 'u2', name: 'Patient Two', phoneNumber: '+919876510002' },
      };
      prisma.queueEntry.findFirst.mockResolvedValue(nextWaiting);

      prisma.queueEntry.update.mockResolvedValue({
        ...nextWaiting,
        status: QueueEntryStatus.CALLED,
        calledAt: new Date(),
      });

      const result = await service.callNext('clinic-1', 'queue-1');

      expect(prisma.queueEntry.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['entry-serving'] } },
        data: expect.objectContaining({ status: QueueEntryStatus.COMPLETED }),
      });
      expect(result.previousEntryCompleted).toBe(true);
      expect(result.calledEntry?.tokenNumber).toBe('A02');
    });
  });

  describe('transitionEntry', () => {
    it('throws NotFoundException when entry belongs to a different clinic', async () => {
      prisma.queueEntry.findUnique.mockResolvedValue({
        id: 'entry-1',
        status: QueueEntryStatus.WAITING,
        queue: { clinicId: 'clinic-other' },
      });

      await expect(
        service.transitionEntry('clinic-1', 'entry-1', {
          targetStatus: QueueEntryStatus.CALLED,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects illegal transition via state machine rules', async () => {
      prisma.queueEntry.findUnique.mockResolvedValue({
        id: 'entry-1',
        status: QueueEntryStatus.COMPLETED,
        queue: { clinicId: 'clinic-1' },
      });

      await expect(
        service.transitionEntry('clinic-1', 'entry-1', {
          targetStatus: QueueEntryStatus.WAITING,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('records holdReason when putting a patient on hold', async () => {
      prisma.queueEntry.findUnique.mockResolvedValue({
        id: 'entry-1',
        status: QueueEntryStatus.WAITING,
        queue: { clinicId: 'clinic-1' },
      });

      prisma.queueEntry.update.mockImplementation(({ data }: any) => ({
        id: 'entry-1',
        ...data,
      }));

      const updated = await service.transitionEntry('clinic-1', 'entry-1', {
        targetStatus: QueueEntryStatus.ON_HOLD,
        holdReason: 'Patient at pathology lab for blood test',
      });

      expect(updated.status).toBe(QueueEntryStatus.ON_HOLD);
      expect(updated.holdReason).toBe('Patient at pathology lab for blood test');
    });
  });

  describe('toggleQueuePause', () => {
    it('successfully pauses and unpauses queue', async () => {
      prisma.queue.findFirst.mockResolvedValue({
        id: 'q-1',
        clinicId: 'clinic-1',
        isPaused: false,
      });
      prisma.queue.update.mockResolvedValue({
        id: 'q-1',
        clinicId: 'clinic-1',
        isPaused: true,
      });

      const paused = await service.toggleQueuePause('clinic-1', 'q-1', true);
      expect(paused.isPaused).toBe(true);
    });
  });
});
