import { describe, expect, it } from 'vitest';
import { BILLING_PLANS, PLAN_LABELS, PLAN_PRICES_MXN, PLAN_USER_LIMITS, planDisplayLabel } from '../billing';

/**
 * Congela los valores tal como existen en Marcor360/OMP@v1.31.3
 * (src/types/billing.ts). Si este test falla porque cambiaste una constante
 * a mano, primero revisa si OMP/src/types/billing.ts también cambió en el
 * repo principal antes de "corregir" el test — el objetivo es detectar
 * divergencia accidental, no forzar que pase.
 */
describe('billing contract (OMP v1.31.3)', () => {
  it('mantiene las tres claves de plan esperadas', () => {
    expect(BILLING_PLANS).toEqual(['omp_80', 'omp_150', 'omp_250']);
  });

  it('mantiene los límites de usuarios esperados', () => {
    expect(PLAN_USER_LIMITS).toEqual({ omp_80: 80, omp_150: 150, omp_250: 250 });
  });

  it('mantiene los precios MXN esperados', () => {
    expect(PLAN_PRICES_MXN).toEqual({ omp_80: 70, omp_150: 120, omp_250: 200 });
  });

  it('mantiene las etiquetas esperadas', () => {
    expect(PLAN_LABELS).toEqual({ omp_80: 'OMP 80', omp_150: 'OMP 150', omp_250: 'OMP 250' });
  });

  it('genera la etiqueta visible en el formato acordado', () => {
    expect(planDisplayLabel('omp_80')).toBe('OMP 80 — hasta 80 usuarios — $70 MXN/mes');
    expect(planDisplayLabel('omp_150')).toBe('OMP 150 — hasta 150 usuarios — $120 MXN/mes');
    expect(planDisplayLabel('omp_250')).toBe('OMP 250 — hasta 250 usuarios — $200 MXN/mes');
  });
});
