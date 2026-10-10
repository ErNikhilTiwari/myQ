export type AnnouncementType =
  | 'INFO'
  | 'NOTICE'
  | 'DELAY'
  | 'CLOSURE'
  | 'HEALTH_TIP'
  | 'EMERGENCY'
  | 'PROMOTION';

export type AnnouncementPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export type AnnouncementDisplayMode = 'TICKER' | 'CARD' | 'FULLSCREEN_TAKEOVER';

export type AnnouncementAudioMode = 'NONE' | 'CHIME' | 'VOICE';

export type AnnouncementStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'PAUSED'
  | 'EXPIRED'
  | 'ARCHIVED';

export interface CreateAnnouncementDto {
  title: string;
  messageEn: string;
  messageHi?: string;
  type: AnnouncementType;
  priority?: AnnouncementPriority;
  displayMode?: AnnouncementDisplayMode;
  audioMode?: AnnouncementAudioMode;
  queueId?: string;
  displayDeviceId?: string;
  expiresAt?: string;
}

export interface UpdateAnnouncementDto {
  title?: string;
  messageEn?: string;
  messageHi?: string;
  type?: AnnouncementType;
  priority?: AnnouncementPriority;
  displayMode?: AnnouncementDisplayMode;
  audioMode?: AnnouncementAudioMode;
  status?: AnnouncementStatus;
  expiresAt?: string;
}

export interface AnnouncementDto {
  id: string;
  clinicId: string;
  title: string;
  messageEn: string;
  messageHi?: string | null;
  type: AnnouncementType;
  priority: AnnouncementPriority;
  displayMode: AnnouncementDisplayMode;
  audioMode: AnnouncementAudioMode;
  status: AnnouncementStatus;
  queueId?: string | null;
  displayDeviceId?: string | null;
  expiresAt?: string | null;
  createdAt: string;
}

export interface ActiveAnnouncementDto {
  id: string;
  title: string;
  messageEn: string;
  messageHi?: string | null;
  type: AnnouncementType;
  priority: AnnouncementPriority;
  displayMode: AnnouncementDisplayMode;
  audioMode: AnnouncementAudioMode;
  expiresAt?: string | null;
}

export interface VoiceCalloutDto {
  tokenNumber: string;
  roomNumber?: string | null;
  doctorName?: string | null;
  englishSpeech: string;
  hindiSpeech: string;
}
