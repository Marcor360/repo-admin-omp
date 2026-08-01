import type {
  Congregation,
  CongregationFormInput,
  CongregationLeadership,
} from '../types/congregation.types';
import { ERROR_MESSAGES } from '../constants/messages';
import { apiFetch } from '../lib/apiClient';

export async function getCongregations(): Promise<Congregation[]> {
  const res = await apiFetch('/api/congregations');
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || ERROR_MESSAGES.loadCongregations);
  }
  return res.json();
}

export async function getCongregationById(id: string): Promise<Congregation | null> {
  const res = await apiFetch(`/api/congregations/${id}`);
  if (!res.ok) {
    if (res.status === 404) return null;
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || ERROR_MESSAGES.loadCongregation);
  }
  return res.json();
}

export interface CreateCongregationResult {
  congregationId: string;
  firstAdmin: {
    email: string;
    password: string;
    uid: string;
  };
}

export async function createCongregation(input: CongregationFormInput, _superAdminUid?: string): Promise<CreateCongregationResult> {
  const res = await apiFetch('/api/congregations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || ERROR_MESSAGES.createCongregation);
  
  return {
    congregationId: data.congregation?.id || data.id,
    firstAdmin: data.firstAdmin,
  };
}

export async function updateCongregation(
  id: string,
  input: CongregationFormInput,
  _superAdminUid?: string,
): Promise<void> {
  const res = await apiFetch(`/api/congregations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || ERROR_MESSAGES.updateCongregation);
}

export async function updateCongregationBilling(
  id: string,
  billingData: any,
): Promise<void> {
  const res = await apiFetch(`/api/congregations/${id}/billing`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(billingData),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || ERROR_MESSAGES.updateBilling);
}

export async function setCongregationActiveStatus(
  id: string,
  isActive: boolean,
  reason?: string,
): Promise<void> {
  const res = await apiFetch(`/api/congregations/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive, reason }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || ERROR_MESSAGES.updateStatus);
}

export async function updateCongregationLeadership(
  id: string,
  leadership: CongregationLeadership,
  _superAdminUid?: string,
): Promise<void> {
  const res = await apiFetch(`/api/congregations/${id}/leadership`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secretaryUserId: leadership.secretaryUserId ?? null,
      coordinatorUserId: leadership.coordinatorUserId ?? null,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || ERROR_MESSAGES.updateLeadership);
}

export async function deleteCongregation(
  id: string,
  confirmName: string,
): Promise<{ congregationName: string; summary: Record<string, number> }> {
  const res = await apiFetch(`/api/congregations/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirmName }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || ERROR_MESSAGES.deleteCongregation);
  return { congregationName: data.congregationName, summary: data.summary };
}

/**
 * Descarga un archivo Excel con todos los datos de la congregación:
 * hoja "Congregación" (datos generales) y hoja "Usuarios" (todos los usuarios).
 */
export async function exportCongregationExcel(id: string, name: string): Promise<void> {
  const res = await apiFetch(`/api/congregations/${id}/export`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || ERROR_MESSAGES.exportData);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `congregacion_${name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
