import { ERROR_MESSAGES } from '../constants/messages';
import { apiFetch } from '../lib/apiClient';

export interface MaintenanceStatus {
  active: boolean;
  activatedAt?: string;
  activatedBy?: string;
  expiresAt?: number;   // epoch ms — para el countdown
  maxHours?: number;
}

export async function getMaintenanceStatus(): Promise<MaintenanceStatus> {
  const res = await apiFetch('/api/system/maintenance');
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || ERROR_MESSAGES.loadMaintenance);
  }
  return res.json();
}

export async function setMaintenanceMode(
  active: boolean,
): Promise<{ success: boolean; affected?: number; restored?: number; message: string }> {
  const res = await apiFetch('/api/system/maintenance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || ERROR_MESSAGES.updateMaintenance);
  return data;
}
