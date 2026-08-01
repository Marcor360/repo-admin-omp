import { useState } from 'react';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { Button } from '../ui/Button';

export const DEACTIVATION_REASONS = [
  'Falta de pago de servicios',
  'Violación de políticas',
  'Desactivación temporal',
  'Mantenimiento de sistema',
] as const;

export type DeactivationReason = (typeof DEACTIVATION_REASONS)[number];

interface DeactivateReasonDialogProps {
  isOpen: boolean;
  congregationName: string;
  loading?: boolean;
  onConfirm: (reason: DeactivationReason) => void | Promise<void>;
  onCancel: () => void;
}

export function DeactivateReasonDialog({
  isOpen,
  congregationName,
  loading = false,
  onConfirm,
  onCancel,
}: DeactivateReasonDialogProps) {
  const [selectedReason, setSelectedReason] = useState<DeactivationReason>(DEACTIVATION_REASONS[2]);

  useEscapeKey(onCancel, isOpen);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <div
        className="deactivate-reason-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Desactivar congregación"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="deactivate-reason-header">
          <span className="deactivate-reason-icon">⚠️</span>
          <div>
            <h2>Desactivar congregación</h2>
            <p>Selecciona el motivo antes de continuar</p>
          </div>
        </div>

        {/* Body */}
        <div className="deactivate-reason-body">
          <p className="deactivate-reason-intro">
            La congregación <strong>"{congregationName}"</strong> quedará inactiva.
            Los usuarios no podrán acceder hasta que se reactive.
          </p>

          <div className="deactivate-reason-options">
            {DEACTIVATION_REASONS.map((reason) => (
              <label
                key={reason}
                className={`deactivate-reason-option${selectedReason === reason ? ' selected' : ''}`}
              >
                <input
                  type="radio"
                  name="deactivation-reason"
                  value={reason}
                  checked={selectedReason === reason}
                  onChange={() => setSelectedReason(reason)}
                />
                <span className="deactivate-reason-option-icon">
                  {reason === 'Falta de pago de servicios' && '💳'}
                  {reason === 'Violación de políticas' && '🚫'}
                  {reason === 'Desactivación temporal' && '⏸️'}
                  {reason === 'Mantenimiento de sistema' && '🔧'}
                </span>
                <span>{reason}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="deactivate-reason-footer">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button type="button" variant="danger" onClick={() => onConfirm(selectedReason)} disabled={loading}>
            {loading ? 'Desactivando...' : 'Desactivar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
