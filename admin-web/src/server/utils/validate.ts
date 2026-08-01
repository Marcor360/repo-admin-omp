import type { Response } from 'express';
import type { ZodType } from 'zod';

/**
 * Valida `data` contra `schema`. Si falla, responde 400 con los mensajes de
 * Zod y devuelve `undefined` — el caller debe hacer `return` inmediatamente.
 * Si pasa, devuelve el valor ya tipado y coaccionado (ej. query strings a
 * number).
 */
export function parseOrRespond<T>(schema: ZodType<T>, data: unknown, res: Response): T | undefined {
  const result = schema.safeParse(data);
  if (!result.success) {
    res.status(400).json({
      error: 'Datos inválidos.',
      issues: result.error.issues.map((issue) => `${issue.path.join('.') || 'valor'}: ${issue.message}`),
    });
    return undefined;
  }
  return result.data;
}
