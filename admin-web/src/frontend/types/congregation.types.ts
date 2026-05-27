import type { Timestamp } from 'firebase/firestore';

/** Planes disponibles para una congregación OMP */
export type OmpPlan = 'basico' | 'intermedio' | 'completo';

/** Configuración de cada plan */
export const OMP_PLANS: Record<OmpPlan, { label: string; maxUsers: number; description: string; color: string }> = {
  basico: {
    label: 'OMP Básico',
    maxUsers: 70,
    description: 'Hasta 70 usuarios activos',
    color: '#6366f1',
  },
  intermedio: {
    label: 'OMP Intermedio',
    maxUsers: 120,
    description: 'Hasta 120 usuarios activos',
    color: '#0ea5e9',
  },
  completo: {
    label: 'OMP Completo',
    maxUsers: 200,
    description: 'Hasta 200 usuarios activos',
    color: '#10b981',
  },
};

export interface CongregationLeadership {
  secretaryUserId?: string | null;
  coordinatorUserId?: string | null;
}

export interface CongregationBilling {
  billingMode: 'paid' | 'free' | 'manual' | 'disabled';
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'none';
  plan: 'basic' | 'intermediate' | 'complete' | 'custom' | 'none';
  maxUsers: number;

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
  plan?: OmpPlan;
  isActive: boolean;
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
  plan?: OmpPlan;
  isActive: boolean;
}

export interface CongregationWithStats extends Congregation {
  activeUsersCount: number;
  inactiveUsersCount: number;
  secretaryName: string;
  coordinatorName: string;
}
