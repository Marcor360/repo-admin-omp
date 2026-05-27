import type { Timestamp } from 'firebase/firestore';

export type AnnouncementType = 'info' | 'success' | 'warning' | 'maintenance';
export type AnnouncementTarget = 'all' | 'app' | 'web';

export interface SystemAnnouncement {
  id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  active: boolean;
  target: AnnouncementTarget;
  showOnce: boolean;
  priority: number;
  startsAt: Timestamp;
  endsAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

export interface CreateAnnouncementPayload {
  title: string;
  message: string;
  type: AnnouncementType;
  active: boolean;
  target: AnnouncementTarget;
  showOnce: boolean;
  priority: number;
  startsAt: string; // ISO string for form handling
  endsAt: string | null; // ISO string for form handling
}

export interface UpdateAnnouncementPayload extends Partial<CreateAnnouncementPayload> {}
