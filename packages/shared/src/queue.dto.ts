import { QueueEntryStatus } from './queue-status.enum';

export interface CreateQueueDto {
  name: string;
  doctorId?: string;
  serviceId?: string;
}

export interface QueueDto {
  id: string;
  clinicId: string;
  name: string;
  doctorId?: string | null;
  serviceId?: string | null;
  isPaused: boolean;
  currentSeq: number;
  activeCount?: number;
  currentServingToken?: string | null;
  createdAt: string;
}

export interface IssueTokenDto {
  userId: string;
  tokenPrefix?: string;
  notes?: string;
}

export interface QueueEntryDto {
  id: string;
  queueId: string;
  userId: string;
  userName?: string;
  tokenNumber: string;
  sequenceNumber: number;
  status: QueueEntryStatus;
  holdReason?: string | null;
  publicToken: string;
  estimatedWait: number; // minutes
  calledAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
}

export interface QueueTransitionDto {
  targetStatus: QueueEntryStatus;
  holdReason?: string;
}

export interface CallNextResultDto {
  calledEntry: QueueEntryDto | null;
  previousEntryCompleted: boolean;
  message: string;
}

export interface PublicTokenStatusDto {
  tokenNumber: string;
  status: QueueEntryStatus;
  clinicName: string;
  queueName: string;
  doctorName?: string | null;
  currentServingToken?: string | null;
  positionAhead: number;
  estimatedWaitMinutes: number;
  holdReason?: string | null;
  calledAt?: string | null;
  lastUpdated: string;
}
