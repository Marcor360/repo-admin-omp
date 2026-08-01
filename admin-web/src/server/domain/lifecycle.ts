/**
 * Modelo propio del panel — no existe en OMP. El principal solo conoce
 * `congregations/{cid}.isActive` (booleano, leído directamente por el
 * cliente en `src/context/user-context.tsx` vía `getCongregationAccessState`).
 * `lifecycleStatus` es una capa más rica encima de ese mismo booleano:
 * `isActive` SIEMPRE debe escribirse como `lifecycleStatus === 'active'`,
 * en la misma operación atómica — nunca por separado.
 */
export type LifecycleStatus = 'active' | 'paused' | 'blocked' | 'archived';

export const LIFECYCLE_STATUSES: readonly LifecycleStatus[] = ['active', 'paused', 'blocked', 'archived'];

export function isLifecycleStatus(value: unknown): value is LifecycleStatus {
  return value === 'active' || value === 'paused' || value === 'blocked' || value === 'archived';
}

/** Transiciones permitidas. `archived` solo puede volver a `active` — es borrado lógico, no una pausa más. */
const ALLOWED_TRANSITIONS: Record<LifecycleStatus, readonly LifecycleStatus[]> = {
  active: ['paused', 'blocked', 'archived'],
  paused: ['active', 'blocked', 'archived'],
  blocked: ['active', 'paused', 'archived'],
  archived: ['active'],
};

export function isTransitionAllowed(from: LifecycleStatus, to: LifecycleStatus): boolean {
  if (from === to) return false;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** Deriva lifecycleStatus para congregaciones que aún no lo tienen (compatibilidad con datos previos a la Fase C). */
export function deriveLifecycleStatus(data: FirebaseFirestore.DocumentData | undefined): LifecycleStatus {
  const stored = data?.lifecycleStatus;
  if (isLifecycleStatus(stored)) return stored;
  const isActive = data?.isActive !== undefined ? data.isActive : (data?.active !== undefined ? data.active : true);
  return isActive === false ? 'paused' : 'active';
}
