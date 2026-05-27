import { Badge } from '../ui/Badge';

interface UserStatusBadgeProps {
  isActive?: boolean;
}

export function UserStatusBadge({ isActive }: UserStatusBadgeProps) {
  return <Badge tone={isActive ? 'success' : 'danger'}>{isActive ? 'Activo' : 'Inactivo'}</Badge>;
}
