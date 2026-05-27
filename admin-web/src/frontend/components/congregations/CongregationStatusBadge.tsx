import { Badge } from '../ui/Badge';

interface CongregationStatusBadgeProps {
  isActive: boolean;
}

export function CongregationStatusBadge({ isActive }: CongregationStatusBadgeProps) {
  return <Badge tone={isActive ? 'success' : 'danger'}>{isActive ? 'Activa' : 'Inactiva'}</Badge>;
}
