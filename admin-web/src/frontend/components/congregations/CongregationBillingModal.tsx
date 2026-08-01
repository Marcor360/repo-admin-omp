import { useEffect, useState } from 'react';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import type { BillingPlanKey, Congregation } from '../../types/congregation.types';
import { BILLING_PLANS, planDisplayLabel } from '../../types/congregation.types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

interface CongregationBillingModalProps {
  congregation: Congregation | null;
  isOpen: boolean;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSave: (congregationId: string, payload: any) => Promise<void>;
}

export function CongregationBillingModal({
  congregation,
  isOpen,
  saving,
  error,
  onClose,
  onSave,
}: CongregationBillingModalProps) {
  const [billingMode, setBillingMode] = useState<'paid' | 'free' | 'manual' | 'disabled'>('disabled');
  const [status, setStatus] = useState('none');
  const [planKey, setPlanKey] = useState<BillingPlanKey>('omp_80');
  const [exemptReason, setExemptReason] = useState('');
  const [exemptUntil, setExemptUntil] = useState('');
  
  // Read-only Stripe fields just for visibility
  const [stripeCustomerId, setStripeCustomerId] = useState('');
  const [stripeSubscriptionId, setStripeSubscriptionId] = useState('');

  useEffect(() => {
    if (congregation && isOpen) {
      const b = congregation.billing;
      setBillingMode(b?.billingMode || 'disabled');
      setStatus(b?.status || 'none');
      setPlanKey(b?.planKey || 'omp_80');
      setExemptReason(b?.exemptReason || '');
      
      if (b?.exemptUntil && (b.exemptUntil as any).toDate) {
        setExemptUntil((b.exemptUntil as any).toDate().toISOString().slice(0, 10));
      } else if (b?.exemptUntil) {
        setExemptUntil(new Date(b.exemptUntil as unknown as string).toISOString().slice(0, 10));
      } else {
        setExemptUntil('');
      }

      setStripeCustomerId(b?.stripeCustomerId || '');
      setStripeSubscriptionId(b?.stripeSubscriptionId || '');
    }
  }, [congregation, isOpen]);

  useEscapeKey(onClose, isOpen);

  if (!isOpen || !congregation) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSave(congregation!.id, {
      billingMode,
      status,
      planKey,
      exemptReason,
      exemptUntil: exemptUntil ? new Date(exemptUntil).toISOString() : null,
    });
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal modal--md"
        role="dialog"
        aria-modal="true"
        aria-label="Configuración de Facturación"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <h2>💳 Facturación: {congregation.name}</h2>
          <Button variant="ghost" type="button" onClick={onClose} aria-label="Cerrar">
            ×
          </Button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="modal-body modal-body--scroll">
            <div className="form-grid">
              <Select
                id="billingMode"
                label="Modo de Facturación *"
                value={billingMode}
                onChange={(e) => setBillingMode(e.target.value as any)}
                options={[
                  { label: 'Con cobro automático (Stripe)', value: 'paid' },
                  { label: 'Pago manual', value: 'manual' },
                  { label: 'Gratis / Exenta', value: 'free' },
                  { label: 'Facturación desactivada', value: 'disabled' },
                ]}
              />

              <Select
                id="status"
                label="Estado de cuenta"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { label: 'Ninguno / No aplica', value: 'none' },
                  { label: 'Activo', value: 'active' },
                  { label: 'En prueba (Trial)', value: 'trialing' },
                  { label: 'Atrasado (Past Due)', value: 'past_due' },
                  { label: 'No pagado (Unpaid)', value: 'unpaid' },
                  { label: 'Cancelado', value: 'canceled' },
                ]}
              />

              <Select
                id="plan"
                label="Plan asignado"
                value={planKey}
                onChange={(e) => setPlanKey(e.target.value as BillingPlanKey)}
                options={BILLING_PLANS.map((key) => ({ label: planDisplayLabel(key), value: key }))}
              />

              {(billingMode === 'free' || billingMode === 'manual') && (
                <>
                  <Input
                    id="exemptReason"
                    label="Motivo de la exención / Notas"
                    value={exemptReason}
                    onChange={(e) => setExemptReason(e.target.value)}
                    placeholder="Ej. Promoción especial, trato manual..."
                  />
                  <Input
                    id="exemptUntil"
                    label="Válido hasta (opcional)"
                    type="date"
                    value={exemptUntil}
                    onChange={(e) => setExemptUntil(e.target.value)}
                  />
                </>
              )}
            </div>

            <div className="readonly-panel">
              <h4>Datos de Stripe (Solo lectura)</h4>
              <p><strong>Customer ID:</strong> {stripeCustomerId || 'No asignado'}</p>
              <p><strong>Subscription ID:</strong> {stripeSubscriptionId || 'No asignado'}</p>
            </div>

            {error && <p className="form-error">{error}</p>}
          </div>

          <div className="modal-footer">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar facturación'}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
