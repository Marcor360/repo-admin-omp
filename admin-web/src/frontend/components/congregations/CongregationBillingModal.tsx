import { useEffect, useState } from 'react';
import type { Congregation } from '../../types/congregation.types';
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
  const [plan, setPlan] = useState('none');
  const [maxUsers, setMaxUsers] = useState(0);
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
      setPlan(b?.plan || 'none');
      setMaxUsers(b?.maxUsers || 0);
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

  if (!isOpen || !congregation) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSave(congregation!.id, {
      billingMode,
      status,
      plan,
      maxUsers: Number(maxUsers),
      exemptReason,
      exemptUntil: exemptUntil ? new Date(exemptUntil).toISOString() : null,
    });
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Configuración de Facturación"
        onMouseDown={(e) => e.stopPropagation()}
        style={{ maxWidth: '600px' }}
      >
        <header className="modal-header">
          <div>
            <h2 style={{ margin: 0 }}>💳 Facturación: {congregation.name}</h2>
          </div>
          <Button variant="ghost" type="button" onClick={onClose} aria-label="Cerrar">
            ×
          </Button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
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
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                options={[
                  { label: 'Ninguno', value: 'none' },
                  { label: 'Básico', value: 'basic' },
                  { label: 'Intermedio', value: 'intermediate' },
                  { label: 'Completo', value: 'complete' },
                  { label: 'Personalizado', value: 'custom' },
                ]}
              />

              <Input
                id="maxUsers"
                label="Usuarios máximos permitidos"
                type="number"
                value={maxUsers}
                onChange={(e) => setMaxUsers(Number(e.target.value))}
                min={0}
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

            <div style={{ marginTop: '24px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '0.9rem' }}>
              <h4 style={{ margin: '0 0 8px 0', color: 'var(--muted)' }}>Datos de Stripe (Solo lectura)</h4>
              <p style={{ margin: '4px 0' }}><strong>Customer ID:</strong> {stripeCustomerId || 'No asignado'}</p>
              <p style={{ margin: '4px 0' }}><strong>Subscription ID:</strong> {stripeSubscriptionId || 'No asignado'}</p>
            </div>

            {error && <p className="form-error" style={{ marginTop: '12px' }}>{error}</p>}
          </div>

          <div className="modal-footer" style={{ padding: '18px 20px' }}>
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
