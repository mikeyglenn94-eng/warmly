import Stripe from "stripe";

let cached: Stripe | null = null;

export function stripe(): Stripe {
  if (cached) return cached;
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  cached = new Stripe(key);
  return cached;
}

export function stripePriceId(): string {
  const id = process.env["STRIPE_PRICE_ID"];
  if (!id) throw new Error("STRIPE_PRICE_ID is not set");
  return id;
}

export function stripeWebhookSecret(): string {
  const s = process.env["STRIPE_WEBHOOK_SECRET"];
  if (!s) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  return s;
}
