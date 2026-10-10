export type DisplayTemplate = 'NOW_SERVING_NEXT' | 'LAST_4_CALLED' | 'SINGLE_LARGE';

export interface DisplayDeviceDto {
  id: string;
  clinicId: string;
  name: string;
  displayToken: string;
  template: DisplayTemplate;
  soundEnabled: boolean;
  lastHeartbeatAt?: string | null;
  isOnline: boolean;
  createdAt: string;
}

export interface CreateDisplayDeviceDto {
  name: string;
  template?: DisplayTemplate;
  soundEnabled?: boolean;
}

export interface ViewerServingItemDto {
  tokenNumber: string;
  roomNumber?: string | null;
  doctorName?: string | null;
  calledAt?: string | null;
}

export interface ViewerWaitingItemDto {
  tokenNumber: string;
  estimatedWaitMinutes: number;
}

export interface ViewerSnapshotDto {
  clinicName: string;
  template: DisplayTemplate;
  soundEnabled: boolean;
  currentServing: ViewerServingItemDto | null;
  recentCalled: ViewerServingItemDto[];
  nextWaiting: ViewerWaitingItemDto[];
  activeQueuesCount: number;
  lastUpdated: string;
}
