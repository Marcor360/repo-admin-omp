import type { Timestamp } from 'firebase/firestore';
import type { BillingPlanKey } from '../../shared/contracts/billing';

export type { BillingPlanKey } from '../../shared/contracts/billing';
export { BILLING_PLANS, PLAN_LABELS, PLAN_PRICES_MXN, PLAN_USER_LIMITS, planDisplayLabel } from '../../shared/contracts/billing';

/** Color de acento por plan — puramente visual, no viene del principal. */
export const PLAN_COLORS: Record<BillingPlanKey, string> = {
  omp_80: '#6366f1',
  omp_150: '#0ea5e9',
  omp_250: '#10b981',
};

/** Modelo propio del panel (Fase C) — no existe en OMP. isActive sigue siendo
 * la fuente de verdad que lee el principal; lifecycleStatus es más rico. */
export type LifecycleStatus = 'active' | 'paused' | 'blocked' | 'archived';

export interface CongregationLeadership {
  secretaryUserId?: string | null;
  coordinatorUserId?: string | null;
}

export interface CongregationBilling {
  billingMode: 'paid' | 'free' | 'manual' | 'disabled';
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'none';
  planKey?: BillingPlanKey;
  activeUsersLimit?: number;
  userLimit?: number;

  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;

  currentPeriodStart?: Timestamp | null;
  currentPeriodEnd?: Timestamp | null;

  cancelAtPeriodEnd?: boolean;
  lastPaymentStatus?: 'paid' | 'failed' | 'pending' | null;

  exemptReason?: string | null;
  exemptUntil?: Timestamp | null;

  updatedAt?: Timestamp;
}

export interface Congregation {
  id: string;
  name: string;
  nameKey: string;
  city?: string;
  state?: string;
  country?: string;
  circuit?: string;
  domain?: string;
  /** Resuelto por el servidor: billing.planKey con fallback a campos legados. Nunca undefined. */
  planKey: BillingPlanKey;
  isActive: boolean;
  /** Resuelto por el servidor a partir de lifecycleStatus, con fallback a isActive. Nunca undefined. */
  lifecycleStatus: LifecycleStatus;
  pauseReason?: string | null;
  blockReason?: string | null;
  leadership?: CongregationLeadership;
  billing?: CongregationBilling;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  createdBy?: string;
  updatedBy?: string;
}

export interface CongregationFormInput {
  name: string;
  city?: string;
  state?: string;
  country?: string;
  circuit?: string;
  planKey?: BillingPlanKey;
  isActive: boolean;
}

export interface CongregationWithStats extends Congregation {
  activeUsersCount: number;
  inactiveUsersCount: number;
  secretaryName: string;
  coordinatorName: string;
}
