import { Badge } from '../ui/Badge';

interface RoleBadgeProps {
  role?: string;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  if (role === 'admin') return <Badge tone="info">Administrador</Badge>;
  if (role === 'supervisor') return <Badge tone="warning">Supervisor</Badge>;
  if (role === 'user') return <Badge tone="neutral">Usuario</Badge>;
  return <Badge tone="neutral">Sin rol</Badge>;
}
