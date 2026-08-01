import type { AppUser, UpdateUserPayload, UserFilter } from '../types/user.types';
import { getUserDisplayName } from '../utils/userDisplay';
import { ERROR_MESSAGES } from '../constants/messages';
import { apiFetch } from '../lib/apiClient';

function sortUsersByDisplayName(users: AppUser[]): AppUser[] {
  return [...users].sort((a, b) => getUserDisplayName(a).localeCompare(getUserDisplayName(b), 'es'));
}

export async function getUsersByCongregation(
  congregationId: string,
  filter: UserFilter = 'all',
  maxResults = 200,
): Promise<AppUser[]> {
  const url = new URL(`/api/congregations/${congregationId}/users`, window.location.origin);
  if (filter === 'active' || filter === 'inactive') {
    url.searchParams.append('status', filter);
  } else if (filter === 'admins') {
    url.searchParams.append('role', 'admin');
  } else if (filter === 'supervisors') {
    url.searchParams.append('role', 'supervisor');
  } else if (filter === 'users') {
    url.searchParams.append('role', 'user');
  }

  const res = await apiFetch(url.toString());
  if (!res.ok) throw new Error(ERROR_MESSAGES.loadUsers);
  const data: { users: AppUser[]; nextCursor: string | null } = await res.json();
  return sortUsersByDisplayName(data.users).slice(0, maxResults);
}

export async function getActiveUsersByCongregation(congregationId: string): Promise<AppUser[]> {
  return getUsersByCongregation(congregationId, 'active', 300);
}

export async function getAdminsByCongregation(congregationId: string): Promise<AppUser[]> {
  return getUsersByCongregation(congregationId, 'admins', 300);
}

export async function getSupervisorsByCongregation(congregationId: string): Promise<AppUser[]> {
  return getUsersByCongregation(congregationId, 'supervisors', 300);
}

export async function getUserById(_uid: string): Promise<AppUser | null> {
  console.warn('getUserById ya no realiza llamadas directas. Busca en el array local.');
  return null;
}

export async function updateUser(
  congregationId: string,
  userId: string,
  payload: UpdateUserPayload,
): Promise<AppUser> {
  const res = await apiFetch(`/api/congregations/${congregationId}/users/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || ERROR_MESSAGES.updateUser);
  }
  return res.json();
}

export async function changeUserPassword(
  congregationId: string,
  userId: string,
  password: string,
): Promise<void> {
  const res = await apiFetch(`/api/congregations/${congregationId}/users/${userId}/password`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || ERROR_MESSAGES.changePassword);
  }
}

export async function deleteUser(congregationId: string, userId: string): Promise<void> {
  const res = await apiFetch(`/api/congregations/${congregationId}/users/${userId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || ERROR_MESSAGES.deleteUser);
  }
}

export function clearUserCache() {}
