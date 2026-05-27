import type { CreateAnnouncementPayload, SystemAnnouncement, UpdateAnnouncementPayload } from '../types/announcement.types';

export async function getSystemAnnouncements(): Promise<SystemAnnouncement[]> {
  const res = await fetch('/api/announcements');
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Error cargando avisos del sistema');
  }
  return res.json();
}

export async function createSystemAnnouncement(payload: CreateAnnouncementPayload): Promise<SystemAnnouncement> {
  const res = await fetch('/api/announcements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Error creando aviso');
  }
  return res.json();
}

export async function updateSystemAnnouncement(id: string, payload: UpdateAnnouncementPayload): Promise<SystemAnnouncement> {
  const res = await fetch(`/api/announcements/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Error actualizando aviso');
  }
  return res.json();
}

export async function deleteSystemAnnouncement(id: string): Promise<void> {
  const res = await fetch(`/api/announcements/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Error eliminando aviso');
  }
}
