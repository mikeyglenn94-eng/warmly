import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { usersTable } from "@warmly/db";
import type { MeResponse } from "@warmly/api-spec";
import { db } from "../db";
import { isPaid } from "../lib/billing";
import { requireAuth } from "../middleware/require-auth";

const router: IRouter = Router();

// Surfaces only the four billing-relevant fields the dashboard needs to
// gate UI. Stripe customer/sub IDs stay server-side.
router.get("/me", requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const [user] = await db()
    .select({
      id: usersTable.id,
      email: usersTable.email,
      subscriptionStatus: usersTable.subscriptionStatus,
      planActiveUntil: usersTable.planActiveUntil,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const out: MeResponse = {
    id: user.id,
    email: user.email,
    isPaid: isPaid({
      subscriptionStatus: user.subscriptionStatus,
      planActiveUntil: user.planActiveUntil,
    }),
    subscriptionStatus:
      user.subscriptionStatus === "active" ||
      user.subscriptionStatus === "past_due" ||
      user.subscriptionStatus === "canceled"
        ? user.subscriptionStatus
        : null,
    planActiveUntil: user.planActiveUntil ? user.planActiveUntil.toISOString() : null,
  };

  res.json(out);
});

export default router;
