import { useState } from 'react';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import type { CongregationWithStats } from '../../types/congregation.types';

interface DeleteCongregationDialogProps {
  congregation: CongregationWithStats;
  loading: boolean;
  onConfirm: (confirmName: string) => void;
  onCancel: () => void;
}

const DELETION_ITEMS = [
  { icon: '👤', label: 'Usuarios, perfiles y cuentas de acceso (Firebase Auth)' },
  { icon: '🔔', label: 'Tokens de notificaciones push de cada usuario' },
  { icon: '🏛️', label: 'Información general de la congregación y plan privado' },
  { icon: '🧑‍🤝‍🧑', label: 'Personas / publicadores registrados' },
  { icon: '📅', label: 'Reuniones y asignaciones de reuniones' },
  { icon: '📋', label: 'Asignaciones generales de la congregación' },
  { icon: '🎤', label: 'Salidas / discursos externos (outgoingTalks)' },
  { icon: '🧹', label: 'Grupos de limpieza y asignaciones (ambas colecciones)' },
  { icon: '📆', label: 'Eventos de congregación' },
  { icon: '📊', label: 'Informes de predicación y envíos por usuario' },
  { icon: '🔕', label: 'Notificaciones internas y globales relacionadas' },
  { icon: '📝', label: 'Registros de cambios (changeLogs)' },
  { icon: '📈', label: 'Resumen del dashboard' },
] as const;

export function DeleteCongregationDialog({
  congregation,
  loading,
  onConfirm,
  onCancel,
}: DeleteCongregationDialogProps) {
  const [inputName, setInputName] = useState('');
  const totalUsers = (congregation.activeUsersCount ?? 0) + (congregation.inactiveUsersCount ?? 0);
  const nameMatches = inputName.trim() === congregation.name.trim();

  useEscapeKey(onCancel);

  return (
    <div className="credentials-modal-overlay" role="presentation" onClick={onCancel}>
      <div
        className="delete-confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Eliminar congregación permanentemente"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header rojo */}
        <div className="delete-confirm-header">
          <span className="delete-confirm-icon">🗑️</span>
          <div>
            <h2>Eliminar congregación permanentemente</h2>
            <p>Esta acción <strong>no se puede deshacer</strong>. Todos los datos serán borrados.</p>
          </div>
        </div>

        <div className="delete-confirm-body">

          {/* Intro */}
          <p className="delete-confirm-intro">
            Se eliminarán <strong>todos</strong> los datos vinculados a{' '}
            <strong>"{congregation.name}"</strong>
            {totalUsers > 0 && <> (<strong>{totalUsers}</strong> usuario{totalUsers !== 1 ? 's' : ''})</>},
            incluyendo:
          </p>

          {/* Lista completa de lo que se elimina */}
          <ul className="delete-confirm-list">
            {DELETION_ITEMS.map(({ icon, label }) => (
              <li key={label}>
                <span>{icon}</span>
                <span>{label}</span>
              </li>
            ))}
          </ul>

          {/* Aviso Excel */}
          <div className="delete-confirm-excel-notice">
            📥 <strong>Se descargará automáticamente un respaldo Excel</strong> con todos
            los datos de la congregación (información general + usuarios) antes de eliminar.
            Guárdalo en un lugar seguro.
          </div>

          {/* Campo de confirmación por nombre */}
          <div className="delete-confirm-input-group">
            <label htmlFor="delete-confirm-input">
              Escribe <strong>{congregation.name}</strong> para confirmar la eliminación:
            </label>
            <input
              id="delete-confirm-input"
              type="text"
              className="input"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              placeholder={congregation.name}
              autoComplete="off"
              disabled={loading}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="delete-confirm-footer">
          <button
            type="button"
            className="button button-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="button button-danger"
            onClick={() => onConfirm(inputName.trim())}
            disabled={!nameMatches || loading}
          >
            {loading ? 'Eliminando todo...' : 'Eliminar todo permanentemente'}
          </button>
        </div>

      </div>
    </div>
  );
}
