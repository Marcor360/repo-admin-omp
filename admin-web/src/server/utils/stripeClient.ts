import Stripe from 'stripe';

// Mismo pin que OMP/functions/src/billing/stripe/stripe-client.ts — fijar la
// versión evita cambios de comportamiento silenciosos si la cuenta de Stripe
// cambia su versión por defecto.
const STRIPE_API_VERSION = '2026-05-27.dahlia';

let cachedClient: Stripe | null = null;

/** `null` si STRIPE_SECRET_KEY no está configurada — el caller decide qué hacer. */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!cachedClient) {
    cachedClient = new Stripe(key, { apiVersion: STRIPE_API_VERSION });
  }
  return cachedClient;
}
