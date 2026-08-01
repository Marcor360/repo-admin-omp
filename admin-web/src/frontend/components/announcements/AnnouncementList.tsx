import type { SystemAnnouncement } from '../../types/announcement.types';
import { formatDate } from '../../utils/formatDate';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';

interface AnnouncementListProps {
  announcements: SystemAnnouncement[];
  onEdit: (announcement: SystemAnnouncement) => void;
  onDelete: (id: string) => void;
}

const TYPE_BADGE: Record<string, { tone: 'info' | 'success' | 'warning' | 'danger'; label: string }> = {
  info: { tone: 'info', label: 'Info' },
  success: { tone: 'success', label: 'Éxito' },
  warning: { tone: 'warning', label: 'Alerta' },
  maintenance: { tone: 'danger', label: 'Mantenimiento' },
};

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
      <table className="responsive-table">
        <thead>
          <tr>
            <th>Título</th>
            <th>Tipo / Destino</th>
            <th>Estado</th>
            <th>Vigencia</th>
            <th>Prioridad</th>
            <th className="col-actions">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {announcements.map((a) => {
            const isExpired = a.endsAt && (a.endsAt as any)._seconds * 1000 < Date.now();
            const isActive = a.active && !isExpired;
            const typeBadge = TYPE_BADGE[a.type] ?? TYPE_BADGE.info;

            return (
              <tr key={a.id}>
                <td data-label="Título">
                  <strong>{a.title}</strong>
                  <br />
                  <span className="text-muted-sm">{a.showOnce ? 'Una sola vez' : 'Recurrente'}</span>
                </td>
                <td data-label="Tipo / Destino">
                  <div className="announcement-type-cell">
                    <Badge tone={typeBadge.tone}>{typeBadge.label}</Badge>
                    <span className="text-muted-sm announcement-target">
                      {a.target === 'all' ? 'App & Web' : a.target}
                    </span>
                  </div>
                </td>
                <td data-label="Estado">
                  <Badge tone={isActive ? 'success' : 'neutral'}>
                    {isActive ? 'Activo' : isExpired ? 'Expirado' : 'Inactivo'}
                  </Badge>
                </td>
                <td data-label="Vigencia" className="text-sm">
                  <div className="announcement-date-start">↗ {formatDate(a.startsAt)}</div>
                  <div className="announcement-date-end">↘ {a.endsAt ? formatDate(a.endsAt) : 'Sin fin'}</div>
                </td>
                <td data-label="Prioridad">{a.priority}</td>
                <td data-label="Acciones">
                  <div className="row-actions">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => onEdit(a)}
                      title="Editar aviso"
                      aria-label={`Editar aviso "${a.title}"`}
                      className="row-compact-btn"
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
                      aria-label={`Eliminar aviso "${a.title}"`}
                      className="row-compact-btn announcement-delete-btn"
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
