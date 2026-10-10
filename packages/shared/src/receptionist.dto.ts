import { AuthUserDto } from './auth.dto';
import { QueueEntryDto } from './queue.dto';

export interface WalkInRegistrationDto {
  name: string;
  phoneNumber: string; // 10-digit or E.164
  queueId: string;
  tokenPrefix?: string;
  notes?: string;
}

export interface WalkInResultDto {
  user: AuthUserDto;
  entry: QueueEntryDto;
  isExistingPatient: boolean;
}

export interface ReceptionistDailyStatsDto {
  totalTokensToday: number;
  waitingCount: number;
  calledCount: number;
  onHoldCount: number;
  skippedCount: number;
  completedCount: number;
  avgWaitMinutes: number;
  currentServingToken: string | null;
}
