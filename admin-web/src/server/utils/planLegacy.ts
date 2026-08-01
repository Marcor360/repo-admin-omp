import { type BillingPlanKey, isBillingPlanKey } from '../../shared/contracts/billing';

/**
 * El admin escribió históricamente 'basico'/'intermedio'/'completo' (y en un
 * momento 'basic'/'intermediate'/'complete') en campos que el principal
 * nunca lee (`plan` raíz, `billing.plan`). Este mapa solo existe para migrar
 * esos datos legados hacia `billing.planKey` — no para uso continuo.
 */
const LEGACY_PLAN_ALIASES: Record<string, BillingPlanKey> = {
  basico: 'omp_80',
  basic: 'omp_80',
  intermedio: 'omp_150',
  intermediate: 'omp_150',
  completo: 'omp_250',
  complete: 'omp_250',
};

export function normalizeLegacyPlanKey(value: unknown): BillingPlanKey | undefined {
  if (isBillingPlanKey(value)) return value;
  if (typeof value === 'string' && value in LEGACY_PLAN_ALIASES) {
    return LEGACY_PLAN_ALIASES[value];
  }
  return undefined;
}

/**
 * Resuelve el plan real de una congregación tal como lo vería el principal
 * (`billing.planKey`), con fallback a los campos legados del admin. Nunca
 * lanza: si no encuentra nada válido, cae al plan por defecto del principal.
 */
export function resolvePlanKey(data: FirebaseFirestore.DocumentData | undefined): BillingPlanKey {
  const billing = data?.billing as Record<string, unknown> | undefined;
  return (
    normalizeLegacyPlanKey(billing?.planKey) ??
    normalizeLegacyPlanKey(billing?.plan) ??
    normalizeLegacyPlanKey(data?.planKey) ??
    normalizeLegacyPlanKey(data?.plan) ??
    'omp_80'
  );
}
