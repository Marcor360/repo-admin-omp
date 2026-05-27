import type { SystemAnnouncement } from '../../types/announcement.types';
import { formatDate } from '../../utils/formatDate';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';

interface AnnouncementListProps {
  announcements: SystemAnnouncement[];
  onEdit: (announcement: SystemAnnouncement) => void;
  onDelete: (id: string) => void;
}

function getTypeBadge(type: string) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    info: { bg: '#eff8ff', color: '#1d4ed8', label: 'Info' },
    success: { bg: '#f0fdf4', color: '#15803d', label: 'Éxito' },
    warning: { bg: '#fffbeb', color: '#b45309', label: 'Alerta' },
    maintenance: { bg: '#fef2f2', color: '#b91c1c', label: 'Mantenimiento' },
  };
  const s = styles[type] || styles.info;
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 600,
      }}
    >
      {s.label}
    </span>
  );
}

export function AnnouncementList({ announcements, onEdit, onDelete }: AnnouncementListProps) {
  if (announcements.length === 0) {
    return (
      <EmptyState
        title="No hay avisos del sistema"
        description="Crea un nuevo aviso para informar a los usuarios de la plataforma."
      />
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Título</th>
            <th>Tipo / Destino</th>
            <th>Estado</th>
            <th>Vigencia</th>
            <th>Prioridad</th>
            <th style={{ width: '150px' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {announcements.map((a) => {
            const isExpired = a.endsAt && (a.endsAt as any)._seconds * 1000 < Date.now();
            const isActive = a.active && !isExpired;

            return (
              <tr key={a.id}>
                <td>
                  <strong>{a.title}</strong>
                  <br />
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    {a.showOnce ? 'Una sola vez' : 'Recurrente'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {getTypeBadge(a.type)}
                    <span style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'capitalize' }}>
                      {a.target === 'all' ? 'App & Web' : a.target}
                    </span>
                  </div>
                </td>
                <td>
                  <span
                    className={`status-badge ${isActive ? 'status-active' : 'status-inactive'}`}
                  >
                    {isActive ? 'Activo' : (isExpired ? 'Expirado' : 'Inactivo')}
                  </span>
                </td>
                <td style={{ fontSize: '13px' }}>
                  <div style={{ color: 'var(--success)' }}>
                    ↗ {formatDate(a.startsAt)}
                  </div>
                  <div style={{ color: 'var(--danger)' }}>
                    ↘ {a.endsAt ? formatDate(a.endsAt) : 'Sin fin'}
                  </div>
                </td>
                <td>{a.priority}</td>
                <td>
                  <div className="row-actions">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => onEdit(a)}
                      title="Editar aviso"
                      style={{ padding: '4px 8px', fontSize: '12px', minHeight: 'auto' }}
                    >
                      ✏️
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        if (confirm(`¿Estás seguro de eliminar el aviso "${a.title}"?`)) {
                          onDelete(a.id);
                        }
                      }}
                      title="Eliminar aviso"
                      style={{ padding: '4px 8px', fontSize: '12px', minHeight: 'auto', color: 'var(--danger)' }}
                    >
                      🗑️
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
