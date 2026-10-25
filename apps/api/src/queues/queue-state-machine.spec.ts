import { BadRequestException } from '@nestjs/common';
import { QueueStateMachine } from './queue-state-machine';
import { QueueEntryStatus } from '@queueapp/shared';

describe('QueueStateMachine (Unit Tests & State Integrity)', () => {
  describe('validateTransition', () => {
    it('allows valid BOOKED -> WAITING check-in', () => {
      expect(() =>
        QueueStateMachine.validateTransition(QueueEntryStatus.BOOKED, QueueEntryStatus.WAITING),
      ).not.toThrow();
    });

    it('allows valid WAITING -> CALLED transition', () => {
      expect(() =>
        QueueStateMachine.validateTransition(QueueEntryStatus.WAITING, QueueEntryStatus.CALLED),
      ).not.toThrow();
    });

    it('allows valid CALLED -> IN_SERVICE transition', () => {
      expect(() =>
        QueueStateMachine.validateTransition(QueueEntryStatus.CALLED, QueueEntryStatus.IN_SERVICE),
      ).not.toThrow();
    });

    it('allows valid IN_SERVICE -> COMPLETED transition', () => {
      expect(() =>
        QueueStateMachine.validateTransition(QueueEntryStatus.IN_SERVICE, QueueEntryStatus.COMPLETED),
      ).not.toThrow();
    });

    it('allows putting waiting patient on hold (WAITING -> ON_HOLD)', () => {
      expect(() =>
        QueueStateMachine.validateTransition(QueueEntryStatus.WAITING, QueueEntryStatus.ON_HOLD),
      ).not.toThrow();
    });

    it('allows recalling patient on hold (ON_HOLD -> CALLED)', () => {
      expect(() =>
        QueueStateMachine.validateTransition(QueueEntryStatus.ON_HOLD, QueueEntryStatus.CALLED),
      ).not.toThrow();
    });

    it('allows skipping called patient (CALLED -> SKIPPED)', () => {
      expect(() =>
        QueueStateMachine.validateTransition(QueueEntryStatus.CALLED, QueueEntryStatus.SKIPPED),
      ).not.toThrow();
    });

    it('allows re-calling skipped patient (SKIPPED -> CALLED)', () => {
      expect(() =>
        QueueStateMachine.validateTransition(QueueEntryStatus.SKIPPED, QueueEntryStatus.CALLED),
      ).not.toThrow();
    });

    // EDGE CASES: Disallowed / Illegal Transitions
    it('rejects transitioning from terminal state COMPLETED -> WAITING', () => {
      expect(() =>
        QueueStateMachine.validateTransition(QueueEntryStatus.COMPLETED, QueueEntryStatus.WAITING),
      ).toThrow(BadRequestException);
    });

    it('rejects transitioning from terminal state CANCELLED -> CALLED', () => {
      expect(() =>
        QueueStateMachine.validateTransition(QueueEntryStatus.CANCELLED, QueueEntryStatus.CALLED),
      ).toThrow(BadRequestException);
    });

    it('rejects jumping from BOOKED directly to IN_SERVICE without check-in/call', () => {
      expect(() =>
        QueueStateMachine.validateTransition(QueueEntryStatus.BOOKED, QueueEntryStatus.IN_SERVICE),
      ).toThrow(BadRequestException);
    });

    it('rejects jumping from WAITING directly to COMPLETED without consultation', () => {
      expect(() =>
        QueueStateMachine.validateTransition(QueueEntryStatus.WAITING, QueueEntryStatus.COMPLETED),
      ).toThrow(BadRequestException);
    });
  });

  describe('isTerminal', () => {
    it('correctly classifies terminal states', () => {
      expect(QueueStateMachine.isTerminal(QueueEntryStatus.COMPLETED)).toBe(true);
      expect(QueueStateMachine.isTerminal(QueueEntryStatus.CANCELLED)).toBe(true);
      expect(QueueStateMachine.isTerminal(QueueEntryStatus.NO_SHOW)).toBe(true);
    });

    it('correctly classifies non-terminal states', () => {
      expect(QueueStateMachine.isTerminal(QueueEntryStatus.WAITING)).toBe(false);
      expect(QueueStateMachine.isTerminal(QueueEntryStatus.CALLED)).toBe(false);
      expect(QueueStateMachine.isTerminal(QueueEntryStatus.IN_SERVICE)).toBe(false);
      expect(QueueStateMachine.isTerminal(QueueEntryStatus.ON_HOLD)).toBe(false);
      expect(QueueStateMachine.isTerminal(QueueEntryStatus.BOOKED)).toBe(false);
    });
  });
});
