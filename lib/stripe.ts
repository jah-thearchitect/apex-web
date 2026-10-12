import "server-only";
import Stripe from "stripe";

let client: Stripe | null | undefined;

/** The Stripe client, or null until STRIPE_SECRET_KEY is set. */
export function getStripe(): Stripe | null {
  if (client !== undefined) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  client = key ? new Stripe(key) : null;
  return client;
}

export function stripeConfigured() {
  return !!process.env.STRIPE_SECRET_KEY;
}
