/**
 * Copiado literalmente de Marcor360/OMP@v1.31.3 — src/types/billing.ts
 * (claves `BILLING_PLAN_*` renombradas aquí a `PLAN_*` por brevedad; los
 * valores son idénticos). No dupliques lógica de negocio del principal en
 * este archivo: solo constantes y tipos. Revalida contra
 * OMP/src/types/billing.ts después de cada release de OMP — ver
 * src/shared/contracts/__tests__/billing.contract.test.ts.
 */

export type BillingPlanKey = 'omp_80' | 'omp_150' | 'omp_250';

export const BILLING_PLANS: readonly BillingPlanKey[] = ['omp_80', 'omp_150', 'omp_250'];

export const PLAN_LABELS: Record<BillingPlanKey, string> = {
  omp_80: 'OMP 80',
  omp_150: 'OMP 150',
  omp_250: 'OMP 250',
};

export const PLAN_USER_LIMITS: Record<BillingPlanKey, number> = {
  omp_80: 80,
  omp_150: 150,
  omp_250: 250,
};

export const PLAN_PRICES_MXN: Record<BillingPlanKey, number> = {
  omp_80: 70,
  omp_150: 120,
  omp_250: 200,
};

export function isBillingPlanKey(value: unknown): value is BillingPlanKey {
  return value === 'omp_80' || value === 'omp_150' || value === 'omp_250';
}

/** Etiqueta completa para UI: "OMP 80 — hasta 80 usuarios — $70 MXN/mes". */
export function planDisplayLabel(key: BillingPlanKey): string {
  return `${PLAN_LABELS[key]} — hasta ${PLAN_USER_LIMITS[key]} usuarios — $${PLAN_PRICES_MXN[key]} MXN/mes`;
}
