import { Router, type IRouter, type Request, type Response } from "express";
import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { usersTable } from "@warmly/db";
import {
  CreateCheckoutRequestSchema,
  CreatePortalRequestSchema,
} from "@warmly/api-spec";
import { db } from "../db";
import { requireAuth } from "../middleware/require-auth";
import { stripe, stripePriceId, stripeWebhookSecret } from "../lib/stripe";

const router: IRouter = Router();

// Stripe SDK errors come through with a `type` field like
// "StripeInvalidRequestError" / "StripeAPIError" / "StripeAuthenticationError".
// Shape-check rather than instanceof so we don't have to import the Stripe
// runtime class (the file currently only imports the type).
function isStripeError(
  err: unknown,
): err is { message: string; type: string; code?: string; param?: string } {
  if (typeof err !== "object" || err === null) return false;
  if (!("type" in err)) return false;
  const t = (err as { type: unknown }).type;
  return typeof t === "string" && t.startsWith("Stripe");
}

// Async-handler wrapper that catches anything thrown, logs the full error
// to stderr (visible in Replit deployment logs), and returns 500 with only
// safe fields. For Stripe errors we surface message + type + code + param;
// raw / headers / requestId / statusCode / charge / payment_intent are
// all stripped. For everything else we return a generic message and rely
// on the log for the stack.
function withErrors(
  label: string,
  handler: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response) => Promise<void> {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      console.error(`[${label}] error:`, err);
      if (res.headersSent) return;
      const body: Record<string, unknown> = { error: "Internal error" };
      if (isStripeError(err)) {
        body.error = err.message;
        body.type = err.type;
        if (err.code) body.code = err.code;
        if (err.param) body.param = err.param;
      } else if (err instanceof Error) {
        body.error = err.message;
      }
      res.status(500).json(body);
    }
  };
}

// ── Create Checkout Session ────────────────────────────────────────────────

router.post(
  "/billing/create-checkout-session",
  requireAuth,
  withErrors("billing/create-checkout-session", async (req, res) => {
    const parsed = CreateCheckoutRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues });
      return;
    }
    const { returnUrl } = parsed.data;
    const userId = req.user!.userId;

    const [user] = await db()
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Reuse existing Stripe customer if we already created one; otherwise
    // create one and persist the id.
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe().customers.create({
        email: user.email,
        metadata: { userId: String(user.id) },
      });
      customerId = customer.id;
      await db()
        .update(usersTable)
        .set({ stripeCustomerId: customerId, updatedAt: new Date() })
        .where(eq(usersTable.id, user.id));
    }

    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: stripePriceId(), quantity: 1 }],
      success_url: `${returnUrl}?upgrade=success`,
      cancel_url: `${returnUrl}?upgrade=cancelled`,
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { userId: String(user.id) },
      },
      // Statement descriptor for subscriptions is configured in the Stripe
      // dashboard at Settings → Public details, not per-session — set it
      // there to "WARMLY" so customer bank statements read clearly.
    });

    if (!session.url) {
      res.status(500).json({ error: "Stripe did not return a checkout URL" });
      return;
    }
    res.json({ url: session.url });
  }),
);

// ── Create Billing Portal Session ──────────────────────────────────────────

router.post(
  "/billing/create-portal-session",
  requireAuth,
  withErrors("billing/create-portal-session", async (req, res) => {
    const parsed = CreatePortalRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues });
      return;
    }
    const { returnUrl } = parsed.data;
    const userId = req.user!.userId;

    const [user] = await db()
      .select({ stripeCustomerId: usersTable.stripeCustomerId })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    if (!user || !user.stripeCustomerId) {
      res.status(404).json({ error: "No billing customer on file. Subscribe first." });
      return;
    }

    const session = await stripe().billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: returnUrl,
    });
    res.json({ url: session.url });
  }),
);

// ── Webhook ────────────────────────────────────────────────────────────────
// Mounted with express.raw({ type: 'application/json' }) before the global
// express.json() middleware so the raw body is available for signature
// verification. See src/index.ts for the ordering.

router.post("/billing/webhook", async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"];
  if (typeof sig !== "string") {
    res.status(400).send("Missing stripe-signature header");
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(
      req.body as Buffer,
      sig,
      stripeWebhookSecret(),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid signature";
    res.status(400).send(`Webhook signature verification failed: ${msg}`);
    return;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        if (customerId && subscriptionId) {
          // Pull the subscription so we have status + current_period_end.
          const sub = await stripe().subscriptions.retrieve(subscriptionId);
          await applySubscription(customerId, sub);
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        await applySubscription(customerId, sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        await db()
          .update(usersTable)
          .set({
            subscriptionStatus: "canceled",
            stripeSubscriptionId: sub.id,
            updatedAt: new Date(),
          })
          .where(eq(usersTable.stripeCustomerId, customerId));
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        if (customerId) {
          await db()
            .update(usersTable)
            .set({ subscriptionStatus: "past_due", updatedAt: new Date() })
            .where(eq(usersTable.stripeCustomerId, customerId));
        }
        break;
      }
      default:
        // Ignore other events for v1.
        break;
    }
  } catch (err) {
    // Log but still 200 so Stripe doesn't retry forever; the next event
    // will resync state if this one had a transient failure.
    console.error("Webhook handler error:", err);
  }

  res.json({ received: true });
});

async function applySubscription(customerId: string, sub: Stripe.Subscription): Promise<void> {
  const status = normaliseStatus(sub.status);
  const periodEnd = subscriptionPeriodEnd(sub);
  await db()
    .update(usersTable)
    .set({
      stripeSubscriptionId: sub.id,
      subscriptionStatus: status,
      planActiveUntil: periodEnd,
      updatedAt: new Date(),
    })
    .where(eq(usersTable.stripeCustomerId, customerId));
}

function normaliseStatus(s: Stripe.Subscription.Status): string {
  // Map Stripe statuses we don't model (incomplete, trialing, unpaid) onto
  // the closest of our three buckets. Trialing → active so the form goes
  // live during a trial; unpaid → past_due; incomplete → past_due.
  if (s === "active" || s === "trialing") return "active";
  if (s === "canceled" || s === "incomplete_expired") return "canceled";
  return "past_due";
}

function subscriptionPeriodEnd(sub: Stripe.Subscription): Date | null {
  // current_period_end is a Unix timestamp in seconds. Some recent Stripe
  // SDK type updates relocate it under sub.items.data[0]; the runtime
  // payload is the same. Fall back across both shapes.
  type WithPeriodEnd = { current_period_end?: number | null };
  const root = (sub as unknown as WithPeriodEnd).current_period_end ?? null;
  const itemEnd = (sub.items.data[0] as unknown as WithPeriodEnd | undefined)
    ?.current_period_end ?? null;
  const ts = root ?? itemEnd;
  return ts ? new Date(ts * 1000) : null;
}

export default router;
