import { Link } from 'react-router';
import type { CongregationWithStats } from '../../types/congregation.types';
import { PLAN_COLORS, PLAN_LABELS, PLAN_USER_LIMITS, planDisplayLabel } from '../../types/congregation.types';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { CongregationStatusBadge } from './CongregationStatusBadge';

interface CongregationTableProps {
  congregations: CongregationWithStats[];
  onEdit: (congregation: CongregationWithStats) => void;
  onToggleStatus: (congregation: CongregationWithStats) => void;
  onDelete: (congregation: CongregationWithStats) => void;
  onExport: (congregation: CongregationWithStats) => void;
  onBilling: (congregation: CongregationWithStats) => void;
  exporting?: boolean;
}

export function CongregationTable({ congregations, onEdit, onToggleStatus, onDelete, onExport, onBilling, exporting }: CongregationTableProps) {
  if (congregations.length === 0) {
    return <EmptyState title="No hay congregaciones" description="Crea la primera congregación para empezar." />;
  }

  return (
    <div className="table-wrap">
      <table className="responsive-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Dominio</th>
            <th>Plan</th>
            <th>Ubicación</th>
            <th>Estado</th>
            <th>Activos</th>
            <th>Inactivos</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {congregations.map((congregation) => (
            <tr key={congregation.id}>
              <td data-label="Nombre">
                <strong>{congregation.name}</strong>
              </td>
              <td data-label="Dominio">
                {congregation.domain ? (
                  <span className="domain-text">@{congregation.domain.replace('.com', '')}</span>
                ) : <span className="text-muted-sm">Sin dominio</span>}
              </td>
              <td data-label="Plan">
                {(() => {
                  const planKey = congregation.planKey;
                  const limit = PLAN_USER_LIMITS[planKey];
                  const used = congregation.activeUsersCount;
                  const remaining = Math.max(0, limit - used);
                  return (
                    <span
                      className="plan-badge"
                      title={`${planDisplayLabel(planKey)} — ${used}/${limit} usuarios activos, ${remaining} disponibles`}
                      style={{ '--plan-color': PLAN_COLORS[planKey] } as React.CSSProperties}
                    >
                      {PLAN_LABELS[planKey]}
                    </span>
                  );
                })()}
              </td>
              <td data-label="Ubicación">{[congregation.city, congregation.state, congregation.country].filter(Boolean).join(', ') || 'Sin ubicación'}</td>
              <td data-label="Estado">
                <CongregationStatusBadge isActive={congregation.isActive} />
              </td>
              <td data-label="Activos">{congregation.activeUsersCount}</td>
              <td data-label="Inactivos">{congregation.inactiveUsersCount}</td>
              <td data-label="Acciones">
                <div className="row-actions">
                  <Link className="link-button" to={`/congregations/${congregation.id}`}>
                    Ver
                  </Link>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => onExport(congregation)}
                    disabled={exporting}
                    title="Descargar Excel con todos los datos"
                    aria-label={`Descargar Excel de ${congregation.name}`}
                  >
                    📥 Excel
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => onEdit(congregation)}>
                    Editar
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => onBilling(congregation)}>
                    Facturación
                  </Button>
                  <Button
                    type="button"
                    variant={congregation.isActive ? 'danger' : 'primary'}
                    onClick={() => onToggleStatus(congregation)}
                  >
                    {congregation.isActive ? 'Desactivar' : 'Activar'}
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => onDelete(congregation)}
                    title="Eliminar permanentemente"
                    aria-label={`Eliminar ${congregation.name} permanentemente`}
                  >
                    Eliminar
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
