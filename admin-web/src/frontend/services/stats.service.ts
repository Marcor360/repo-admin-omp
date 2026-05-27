import type { CongregationStats, GlobalStats } from '../types/stats.types';
import { getUsersByCongregation } from './users.service';

export async function getGlobalStats(): Promise<GlobalStats> {
  const res = await fetch('/api/dashboard/stats');
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Error fetching global stats');
  }
  return res.json();
}

export async function getCongregationStats(congregationId: string): Promise<CongregationStats> {
  // En lugar de hacer múltiples queries de conteo, traemos los usuarios y los contamos,
  // ya que la vista de detalle de todas formas va a listar a los usuarios.
  const users = await getUsersByCongregation(congregationId);
  
  let activeUsers = 0;
  let inactiveUsers = 0;
  let admins = 0;
  let supervisors = 0;
  let regularUsers = 0;

  for (const user of users) {
    if (user.isSystemUser) continue; // No contar al admin del sistema

    if (user.isActive) {
      activeUsers++;
      if (user.role === 'admin') admins++;
      else if (user.role === 'supervisor') supervisors++;
      else regularUsers++;
    } else {
      inactiveUsers++;
    }
  }

  return {
    activeUsers,
    inactiveUsers,
    admins,
    supervisors,
    regularUsers,
  };
}
