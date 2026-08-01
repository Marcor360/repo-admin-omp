import type { CreateAnnouncementPayload, SystemAnnouncement, UpdateAnnouncementPayload } from '../types/announcement.types';
import { ERROR_MESSAGES } from '../constants/messages';
import { apiFetch } from '../lib/apiClient';

export async function getSystemAnnouncements(): Promise<SystemAnnouncement[]> {
  const res = await apiFetch('/api/announcements');
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || ERROR_MESSAGES.loadAnnouncements);
  }
  return res.json();
}

export async function createSystemAnnouncement(payload: CreateAnnouncementPayload): Promise<SystemAnnouncement> {
  const res = await apiFetch('/api/announcements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || ERROR_MESSAGES.createAnnouncement);
  }
  return res.json();
}

export async function updateSystemAnnouncement(id: string, payload: UpdateAnnouncementPayload): Promise<SystemAnnouncement> {
  const res = await apiFetch(`/api/announcements/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || ERROR_MESSAGES.updateAnnouncement);
  }
  return res.json();
}

export async function deleteSystemAnnouncement(id: string): Promise<void> {
  const res = await apiFetch(`/api/announcements/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || ERROR_MESSAGES.deleteAnnouncement);
  }
}
