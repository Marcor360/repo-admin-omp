import { Link } from 'react-router';
import type { CongregationWithStats } from '../../types/congregation.types';
import { OMP_PLANS } from '../../types/congregation.types';
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
      <table>
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
              <td>
                <strong>{congregation.name}</strong>
              </td>
              <td>
                {congregation.domain ? (
                  <span style={{fontFamily: 'monospace', fontSize: '13px', color: 'var(--primary)'}}>
                    @{congregation.domain.replace('.com', '')}
                  </span>
                ) : <span style={{color: 'var(--muted)'}}>Sin dominio</span>}
              </td>
              <td>
                {(() => {
                  const planKey = congregation.plan ?? 'basico';
                  const plan = OMP_PLANS[planKey];
                  const used = congregation.activeUsersCount;
                  const remaining = Math.max(0, plan.maxUsers - used);
                  return (
                    <span
                      className="plan-badge"
                      title={`${used}/${plan.maxUsers} usuarios activos — ${remaining} disponibles`}
                      style={{ '--plan-color': OMP_PLANS[planKey].color } as React.CSSProperties}
                    >
                      {plan.label}
                    </span>
                  );
                })()}
              </td>
              <td>{[congregation.city, congregation.state, congregation.country].filter(Boolean).join(', ') || 'Sin ubicación'}</td>
              <td>
                <CongregationStatusBadge isActive={congregation.isActive} />
              </td>
              <td>{congregation.activeUsersCount}</td>
              <td>{congregation.inactiveUsersCount}</td>
              <td>
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
