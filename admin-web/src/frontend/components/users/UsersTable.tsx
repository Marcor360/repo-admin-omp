import type { AppUser } from '../../types/user.types';
import { formatDate } from '../../utils/formatDate';
import { getUserDisplayName } from '../../utils/userDisplay';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { RoleBadge } from './RoleBadge';
import { UserStatusBadge } from './UserStatusBadge';

interface UsersTableProps {
  users: AppUser[];
  onEdit?: (user: AppUser) => void;
  onChangePassword?: (user: AppUser) => void;
  onDelete?: (user: AppUser) => void;
}

export function UsersTable({ users, onEdit, onChangePassword, onDelete }: UsersTableProps) {
  if (users.length === 0) {
    return <EmptyState title="No hay usuarios" description="No se encontraron usuarios con el filtro seleccionado." />;
  }

  const hasActions = onEdit || onChangePassword || onDelete;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Email</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Fecha de creación</th>
            {hasActions ? <th style={{ width: '180px' }}>Acciones</th> : null}
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.uid || user.id} style={user.isSystemUser ? { background: 'var(--bg-secondary, #f8fafc)' } : undefined}>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {getUserDisplayName(user)}
                  {user.isSystemUser && (
                    <span
                      title="Usuario protegido del sistema"
                      style={{
                        fontSize: '11px',
                        background: '#e2e8f0',
                        color: '#475569',
                        padding: '2px 6px',
                        borderRadius: '12px',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      🤖 Sistema
                    </span>
                  )}
                </div>
              </td>
              <td>{user.email || 'Sin email'}</td>
              <td>
                <RoleBadge role={user.role} />
              </td>
              <td>
                {user.isSystemUser ? (
                  <span style={{ fontSize: '13px', color: '#64748b' }}>No cuenta para el plan</span>
                ) : (
                  <UserStatusBadge isActive={user.isActive} />
                )}
              </td>
              <td>{formatDate(user.createdAt)}</td>
              {hasActions ? (
                <td>
                  <div className="row-actions">
                    {onEdit && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => onEdit(user)}
                        title="Editar datos del usuario"
                        style={{ padding: '5px 10px', fontSize: '12px', minHeight: '30px' }}
                      >
                        ✏️ Editar
                      </Button>
                    )}
                    {onChangePassword && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => onChangePassword(user)}
                        title="Cambiar contraseña"
                        style={{
                          padding: '5px 10px',
                          fontSize: '12px',
                          minHeight: '30px',
                          background: '#eff8ff',
                          color: 'var(--info)',
                        }}
                      >
                        🔑 Clave
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        type="button"
                        variant="danger"
                        onClick={() => onDelete(user)}
                        title="Eliminar usuario permanentemente"
                        style={{ padding: '5px 10px', fontSize: '12px', minHeight: '30px' }}
                      >
                        🗑️
                      </Button>
                    )}
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
