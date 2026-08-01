import { useEffect, useState } from 'react';
import { VALIDATION_MESSAGES } from '../../constants/messages';
import type { BillingPlanKey, Congregation, CongregationFormInput } from '../../types/congregation.types';
import { BILLING_PLANS, PLAN_COLORS, PLAN_LABELS, PLAN_PRICES_MXN, PLAN_USER_LIMITS } from '../../types/congregation.types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';

interface CongregationFormModalProps {
  isOpen: boolean;
  congregation?: Congregation | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (input: CongregationFormInput) => Promise<void> | void;
}

const initialForm: CongregationFormInput = {
  name: '',
  city: '',
  state: '',
  country: '',
  circuit: '',
  planKey: 'omp_80',
  isActive: true,
};

export function CongregationFormModal({
  isOpen,
  congregation,
  loading = false,
  onClose,
  onSubmit,
}: CongregationFormModalProps) {
  const [form, setForm] = useState<CongregationFormInput>(initialForm);
  const [error, setError] = useState('');
  const isEditing = Boolean(congregation);

  useEffect(() => {
    if (!isOpen) return;

    if (congregation) {
      setForm({
        name: congregation.name ?? '',
        city: congregation.city ?? '',
        state: congregation.state ?? '',
        country: congregation.country ?? '',
        circuit: congregation.circuit ?? '',
        planKey: congregation.planKey ?? 'omp_80',
        isActive: congregation.isActive,
      });
    } else {
      setForm(initialForm);
    }

    setError('');
  }, [congregation, isOpen]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (form.name.trim().length < 3) {
      setError(VALIDATION_MESSAGES.congregationNameLength);
      return;
    }

    await onSubmit(form);
  }

  return (
    <Modal isOpen={isOpen} title={congregation ? 'Editar congregación' : 'Crear congregación'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="modal-body form-grid">
        <Input
          id="congregation-name"
          label="Nombre"
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          required
        />
        <Input
          id="congregation-city"
          label="Ciudad"
          value={form.city}
          onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
        />
        <Input
          id="congregation-state"
          label="Estado"
          value={form.state}
          onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))}
        />
        <Input
          id="congregation-country"
          label="País"
          value={form.country}
          onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))}
        />
        <Input
          id="congregation-circuit"
          label="Circuito"
          value={form.circuit}
          onChange={(event) => setForm((current) => ({ ...current, circuit: event.target.value }))}
        />
        <Select
          id="congregation-active"
          label="Estado"
          value={String(form.isActive)}
          onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.value === 'true' }))}
          options={[
            { label: 'Activa', value: 'true' },
            { label: 'Inactiva', value: 'false' },
          ]}
        />

        {/* Selector de plan — visible al crear y al editar */}
        <div className="plan-selector full-span">
          <p className="plan-selector-label">
            {isEditing ? 'Cambiar plan' : 'Plan de la congregación'}
          </p>
          <div className="plan-cards">
            {BILLING_PLANS.map((key: BillingPlanKey) => {
              const isSelected = form.planKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  className={`plan-card${isSelected ? ' plan-card--selected' : ''}`}
                  style={{ '--plan-color': PLAN_COLORS[key] } as React.CSSProperties}
                  onClick={() => setForm((current) => ({ ...current, planKey: key }))}
                >
                  <span className="plan-card-dot" />
                  <strong className="plan-card-title">{PLAN_LABELS[key]}</strong>
                  <span className="plan-card-desc">Hasta {PLAN_USER_LIMITS[key]} usuarios activos</span>
                  <span className="plan-card-users">
                    <span className="plan-card-num">{PLAN_USER_LIMITS[key]}</span>
                    <span> usuarios máx.</span>
                  </span>
                  <span className="plan-card-price">${PLAN_PRICES_MXN[key]} MXN/mes</span>
                </button>
              );
            })}
          </div>
        </div>

        {error ? <p className="form-error full-span">{error}</p> : null}
        <footer className="modal-footer full-span">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar'}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
