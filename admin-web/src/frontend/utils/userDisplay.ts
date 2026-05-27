import type { AppUser } from '../types/user.types';

export function getUserDisplayName(user?: AppUser | null): string {
  if (!user) return 'Sin asignar';
  return user.displayName || user.name || user.email || user.uid || user.id || 'Usuario sin nombre';
}
