import type { CongregationStats } from '../../types/stats.types';
import { Card } from '../ui/Card';

interface CongregationStatsCardsProps {
  stats: CongregationStats;
}

export function CongregationStatsCards({ stats }: CongregationStatsCardsProps) {
  return (
    <div className="stats-grid">
      <Card title="Usuarios activos" value={stats.activeUsers} />
      <Card title="Usuarios inactivos" value={stats.inactiveUsers} />
      <Card title="Administradores" value={stats.admins} />
      <Card title="Supervisores" value={stats.supervisors} />
      <Card title="Usuarios normales" value={stats.regularUsers} />
    </div>
  );
}
