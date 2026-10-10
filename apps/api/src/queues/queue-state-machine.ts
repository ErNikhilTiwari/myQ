import { BadRequestException } from '@nestjs/common';
import { QueueEntryStatus } from '@queueapp/shared';

export class QueueStateMachine {
  private static readonly ALLOWED_TRANSITIONS: Record<QueueEntryStatus, QueueEntryStatus[]> = {
    [QueueEntryStatus.BOOKED]: [QueueEntryStatus.WAITING, QueueEntryStatus.CANCELLED],
    [QueueEntryStatus.WAITING]: [
      QueueEntryStatus.CALLED,
      QueueEntryStatus.ON_HOLD,
      QueueEntryStatus.CANCELLED,
      QueueEntryStatus.NO_SHOW,
    ],
    [QueueEntryStatus.CALLED]: [
      QueueEntryStatus.IN_SERVICE,
      QueueEntryStatus.SKIPPED,
      QueueEntryStatus.ON_HOLD,
      QueueEntryStatus.COMPLETED,
    ],
    [QueueEntryStatus.IN_SERVICE]: [QueueEntryStatus.COMPLETED, QueueEntryStatus.ON_HOLD],
    [QueueEntryStatus.SKIPPED]: [QueueEntryStatus.CALLED, QueueEntryStatus.CANCELLED],
    [QueueEntryStatus.ON_HOLD]: [
      QueueEntryStatus.CALLED,
      QueueEntryStatus.WAITING,
      QueueEntryStatus.CANCELLED,
    ],
    [QueueEntryStatus.COMPLETED]: [], // Terminal state
    [QueueEntryStatus.CANCELLED]: [], // Terminal state
    [QueueEntryStatus.NO_SHOW]: [],   // Terminal state
  };

  /**
   * Validates if transition from currentStatus to targetStatus is allowed.
   * Throws BadRequestException if invalid.
   */
  static validateTransition(currentStatus: QueueEntryStatus, targetStatus: QueueEntryStatus): void {
    const allowed = this.ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      throw new BadRequestException(
        `Invalid queue transition: Cannot transition token from "${currentStatus}" to "${targetStatus}". Allowed next states: [${allowed.join(', ') || 'None (Terminal state)'}].`,
      );
    }
  }

  /**
   * Helper checking if state is terminal
   */
  static isTerminal(status: QueueEntryStatus): boolean {
    return [
      QueueEntryStatus.COMPLETED,
      QueueEntryStatus.CANCELLED,
      QueueEntryStatus.NO_SHOW,
    ].includes(status);
  }
}
