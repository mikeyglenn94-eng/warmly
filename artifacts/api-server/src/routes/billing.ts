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
import { withErrors } from "../lib/errors";

const router: IRouter = Router();

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
    console.warn("[webhook] missing stripe-signature header");
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
    console.error("[webhook] signature verification failed:", msg);
    res.status(400).send(`Webhook signature verification failed: ${msg}`);
    return;
  }

  console.log(`[webhook] received ${event.type} (${event.id})`);

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
        console.log(
          `[webhook] checkout.session.completed customer=${customerId ?? "none"} subscription=${subscriptionId ?? "none"}`,
        );
        if (customerId && subscriptionId) {
          const sub = await stripe().subscriptions.retrieve(subscriptionId);
          await applySubscription(customerId, sub);
        } else {
          console.warn("[webhook] checkout.session.completed missing customer or subscription");
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        console.log(
          `[webhook] customer.subscription.updated customer=${customerId} status=${sub.status}`,
        );
        await applySubscription(customerId, sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        console.log(`[webhook] customer.subscription.deleted customer=${customerId}`);
        const result = await db()
          .update(usersTable)
          .set({
            subscriptionStatus: "canceled",
            stripeSubscriptionId: sub.id,
            updatedAt: new Date(),
          })
          .where(eq(usersTable.stripeCustomerId, customerId))
          .returning({ id: usersTable.id });
        if (result.length === 0) {
          console.warn(
            `[webhook] subscription.deleted matched 0 users for customer ${customerId}`,
          );
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        if (customerId) {
          console.log(`[webhook] invoice.payment_failed customer=${customerId}`);
          const result = await db()
            .update(usersTable)
            .set({ subscriptionStatus: "past_due", updatedAt: new Date() })
            .where(eq(usersTable.stripeCustomerId, customerId))
            .returning({ id: usersTable.id });
          if (result.length === 0) {
            console.warn(
              `[webhook] payment_failed matched 0 users for customer ${customerId}`,
            );
          }
        } else {
          console.warn("[webhook] invoice.payment_failed missing customer id");
        }
        break;
      }
      default:
        console.log(`[webhook] ignored event ${event.type}`);
        break;
    }
  } catch (err) {
    // Log but still 200 so Stripe doesn't retry forever; the next event
    // will resync state if this one had a transient failure.
    console.error(`[webhook] handler failed for ${event.type}:`, err);
  }

  res.json({ received: true });
});

async function applySubscription(customerId: string, sub: Stripe.Subscription): Promise<void> {
  const status = normaliseStatus(sub.status);
  const periodEnd = subscriptionPeriodEnd(sub);
  const updates = {
    stripeSubscriptionId: sub.id,
    subscriptionStatus: status,
    planActiveUntil: periodEnd,
    updatedAt: new Date(),
  };

  // Primary lookup: by stripeCustomerId. This is the path for the normal
  // flow where create-checkout-session persisted the id before the user
  // ever paid.
  let result = await db()
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.stripeCustomerId, customerId))
    .returning({ id: usersTable.id });

  if (result.length > 0) {
    console.log(
      `[webhook] applied subscription to user ${result[0]!.id} status=${status} periodEnd=${periodEnd?.toISOString() ?? "null"}`,
    );
    return;
  }

  // Fallback: look up by subscription metadata.userId (set when
  // create-checkout-session creates the session). Recovers from cases
  // where the stripeCustomerId wasn't persisted — e.g. the DB write
  // landed in a different transaction that rolled back, or an earlier
  // failed attempt left the customer/user mapping out of sync. Persists
  // the customerId on the row so subsequent webhooks hit the primary
  // path.
  const metaUserId = sub.metadata?.["userId"];
  if (metaUserId) {
    const userId = Number(metaUserId);
    if (Number.isFinite(userId) && userId > 0) {
      result = await db()
        .update(usersTable)
        .set({ ...updates, stripeCustomerId: customerId })
        .where(eq(usersTable.id, userId))
        .returning({ id: usersTable.id });
      if (result.length > 0) {
        console.log(
          `[webhook] applied subscription via metadata.userId fallback (user=${userId} customer=${customerId} status=${status})`,
        );
        return;
      }
    }
  }

  console.error(
    `[webhook] could not match user for customer ${customerId} (sub ${sub.id}) — neither stripeCustomerId nor metadata.userId matched any row`,
  );
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
