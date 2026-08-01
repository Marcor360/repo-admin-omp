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
      <table className="responsive-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Email</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Fecha de creación</th>
            {hasActions ? <th className="col-actions">Acciones</th> : null}
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.uid || user.id} className={user.isSystemUser ? 'is-system-user' : undefined}>
              <td data-label="Nombre">
                <div className="user-name-cell">
                  {getUserDisplayName(user)}
                  {user.isSystemUser && (
                    <span className="system-user-badge" title="Usuario protegido del sistema">
                      🤖 Sistema
                    </span>
                  )}
                </div>
              </td>
              <td data-label="Email">{user.email || 'Sin email'}</td>
              <td data-label="Rol">
                <RoleBadge role={user.role} />
              </td>
              <td data-label="Estado">
                {user.isSystemUser ? (
                  <span className="text-muted-sm">No cuenta para el plan</span>
                ) : (
                  <UserStatusBadge isActive={user.isActive} />
                )}
              </td>
              <td data-label="Fecha de creación">{formatDate(user.createdAt)}</td>
              {hasActions ? (
                <td data-label="Acciones">
                  <div className="row-actions">
                    {onEdit && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => onEdit(user)}
                        title="Editar datos del usuario"
                        aria-label={`Editar a ${getUserDisplayName(user)}`}
                        className="row-compact-btn"
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
                        aria-label={`Cambiar contraseña de ${getUserDisplayName(user)}`}
                        className="row-compact-btn row-compact-btn--info"
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
                        aria-label={`Eliminar a ${getUserDisplayName(user)}`}
                        className="row-compact-btn"
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
