import { z } from 'zod';
import { LIFECYCLE_STATUSES } from '../domain/lifecycle';

export const lifecycleBodySchema = z.object({
  status: z.enum(LIFECYCLE_STATUSES as [string, ...string[]]),
  reason: z.string().trim().min(1).max(500).optional(),
  until: z.string().datetime().optional().nullable(),
});

export const deleteCongregationBodySchema = z.object({
  confirmName: z.string().trim().min(1, 'Debes escribir el nombre exacto de la congregación.'),
});

export const congregationIdParamSchema = z.object({
  id: z.string().trim().min(1, 'El id de la congregación es requerido.'),
});

export const activityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
});

export const usersQuerySchema = z.object({
  status: z.enum(['active', 'inactive']).optional(),
  role: z.enum(['admin', 'supervisor', 'user']).optional(),
  cursor: z.string().trim().min(1).optional(),
  // 250 = el límite del plan más grande (omp_250): con eso todos los
  // llamadores actuales (que no mandan cursor/limit) siguen recibiendo la
  // congregación completa en una sola página, igual que hoy.
  limit: z.coerce.number().int().min(1).max(250).optional().default(250),
});
