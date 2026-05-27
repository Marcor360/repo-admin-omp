import type { Congregation } from '../types/congregation.types';

/**
 * Determina si se debe mostrar la sección de pagos, checkout, portal de cliente y avisos.
 * Solo debe ser true si billing.billingMode === 'paid'.
 */
export function shouldShowBilling(congregation: Congregation): boolean {
  if (!congregation.billing) return false;
  return congregation.billing.billingMode === 'paid';
}

/**
 * Determina si la congregación está exenta de facturación.
 * true si billing.billingMode === 'free' o 'disabled'.
 */
export function isBillingExempt(congregation: Congregation): boolean {
  if (!congregation.billing) return false;
  return congregation.billing.billingMode === 'free' || congregation.billing.billingMode === 'disabled';
}

/**
 * Determina si se deben advertir los problemas de pago al usuario.
 * true solo si billingMode === 'paid' y status es past_due, unpaid o incomplete.
 */
export function shouldShowPaymentWarnings(congregation: Congregation): boolean {
  if (!congregation.billing) return false;
  if (congregation.billing.billingMode !== 'paid') return false;
  
  const status = congregation.billing.status;
  // Validamos también 'incomplete' aunque no esté tipado explícitamente, ya que Stripe lo puede devolver
  return status === 'past_due' || status === 'unpaid' || status === 'canceled' || (status as string) === 'incomplete';
}

/**
 * Determina si los usuarios pueden acceder y utilizar la congregación.
 */
export function canUseCongregation(congregation: Congregation): boolean {
  // Si no tiene objeto billing, por compatibilidad con congregaciones antiguas
  // mantenemos el acceso hasta que se les configure un modo.
  if (!congregation.billing) return true;

  const { billingMode, status } = congregation.billing;

  // Si billingMode es free o disabled, devolver true
  if (billingMode === 'free' || billingMode === 'disabled') {
    return true;
  }

  // Si billingMode es manual, devolver true solo si status es active o trialing
  if (billingMode === 'manual') {
    return status === 'active' || status === 'trialing';
  }

  // Si billingMode es paid, devolver true si status es active, trialing o past_due
  if (billingMode === 'paid') {
    return status === 'active' || status === 'trialing' || status === 'past_due';
  }

  // En cualquier otro caso (ej. paid pero unpaid/canceled/none)
  return false;
}

/**
 * Determina si la facturación automática está habilitada (sinónimo de shouldShowBilling).
 */
export function isPaidBillingEnabled(congregation: Congregation): boolean {
  return shouldShowBilling(congregation);
}
