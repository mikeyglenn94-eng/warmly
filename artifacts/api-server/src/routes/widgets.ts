import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { widgetsTable, type Widget } from "@warmly/db";
import {
  CreateWidgetRequestSchema,
  UpdateWidgetRequestSchema,
  WidgetPatchSchema,
  type WidgetResponse,
  type PublicWidgetResponse,
} from "@warmly/api-spec";
import { db } from "../db";
import { requireAuth } from "../middleware/require-auth";

const router: IRouter = Router();

function toWidgetResponse(w: Widget): WidgetResponse {
  return {
    id: w.id,
    slug: w.slug,
    active: w.active,
    whatsappNumber: w.whatsappNumber,
    questions: w.questions,
    messageTemplate: w.messageTemplate,
    buttonColour: w.buttonColour,
    buttonPosition: w.buttonPosition === "bottom-left" ? "bottom-left" : "bottom-right",
    brandingEnabled: w.brandingEnabled,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  };
}

function toPublicResponse(w: Widget): PublicWidgetResponse {
  return {
    active: w.active,
    whatsappNumber: w.whatsappNumber,
    questions: w.questions,
    messageTemplate: w.messageTemplate,
    buttonColour: w.buttonColour,
    buttonPosition: w.buttonPosition === "bottom-left" ? "bottom-left" : "bottom-right",
    brandingEnabled: w.brandingEnabled,
  };
}

async function findWidgetByUserId(userId: number): Promise<Widget | null> {
  const [row] = await db()
    .select()
    .from(widgetsTable)
    .where(eq(widgetsTable.userId, userId))
    .limit(1);
  return row ?? null;
}

// ── Public read by slug (no auth) ──────────────────────────────────────────
// Defined BEFORE /widgets/me so /widgets/public/:slug isn't matched against
// the more general /widgets/me path.
router.get("/widgets/public/:slug", async (req, res) => {
  const slug = req.params["slug"];
  if (!slug) {
    res.status(404).json({ error: "Widget not found" });
    return;
  }
  const [row] = await db()
    .select()
    .from(widgetsTable)
    .where(eq(widgetsTable.slug, slug))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "Widget not found" });
    return;
  }
  res.json(toPublicResponse(row));
});

// ── /widgets/me — caller's single widget ───────────────────────────────────
// v1 is one widget per user. Enforced at the application layer (POST returns
// 409 if the user already has one); the schema doesn't carry a unique
// constraint on userId so this can be relaxed later without a migration.

router.get("/widgets/me", requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const widget = await findWidgetByUserId(userId);
  if (!widget) {
    res.status(404).json({ error: "No widget configured" });
    return;
  }
  res.json(toWidgetResponse(widget));
});

router.post("/widgets/me", requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const parsed = CreateWidgetRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid widget payload", issues: parsed.error.issues });
    return;
  }

  const existing = await findWidgetByUserId(userId);
  if (existing) {
    res.status(409).json({ error: "Widget already exists for this user; use PUT /widgets/me to update" });
    return;
  }

  const { slug, ...config } = parsed.data;
  const [slugTaken] = await db()
    .select({ id: widgetsTable.id })
    .from(widgetsTable)
    .where(eq(widgetsTable.slug, slug))
    .limit(1);
  if (slugTaken) {
    res.status(409).json({ error: "Slug already taken" });
    return;
  }

  const [row] = await db()
    .insert(widgetsTable)
    .values({
      id: randomUUID(),
      userId,
      slug,
      whatsappNumber: config.whatsappNumber,
      questions: config.questions,
      messageTemplate: config.messageTemplate,
      buttonColour: config.buttonColour,
      buttonPosition: config.buttonPosition,
      brandingEnabled: config.brandingEnabled,
    })
    .returning();
  if (!row) {
    res.status(500).json({ error: "Failed to create widget" });
    return;
  }
  res.status(201).json(toWidgetResponse(row));
});

router.put("/widgets/me", requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const parsed = UpdateWidgetRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid widget payload", issues: parsed.error.issues });
    return;
  }
  const updates = parsed.data;

  const existing = await findWidgetByUserId(userId);
  if (!existing) {
    res.status(404).json({ error: "No widget configured" });
    return;
  }

  if (updates.slug && updates.slug !== existing.slug) {
    const [taken] = await db()
      .select({ id: widgetsTable.id })
      .from(widgetsTable)
      .where(eq(widgetsTable.slug, updates.slug))
      .limit(1);
    if (taken) {
      res.status(409).json({ error: "Slug already taken" });
      return;
    }
  }

  const [row] = await db()
    .update(widgetsTable)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(widgetsTable.id, existing.id), eq(widgetsTable.userId, userId)))
    .returning();
  if (!row) {
    res.status(500).json({ error: "Failed to update widget" });
    return;
  }
  res.json(toWidgetResponse(row));
});

// PATCH for the pause toggle. Single-purpose payload: `{ active: boolean }`.
router.patch("/widgets/me", requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const parsed = WidgetPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid patch payload", issues: parsed.error.issues });
    return;
  }
  if (Object.keys(parsed.data).length === 0) {
    res.status(400).json({ error: "Empty patch" });
    return;
  }

  const [row] = await db()
    .update(widgetsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(widgetsTable.userId, userId))
    .returning();
  if (!row) {
    res.status(404).json({ error: "No widget configured" });
    return;
  }
  res.json(toWidgetResponse(row));
});

router.delete("/widgets/me", requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const deleted = await db()
    .delete(widgetsTable)
    .where(eq(widgetsTable.userId, userId))
    .returning({ id: widgetsTable.id });
  if (deleted.length === 0) {
    res.status(404).json({ error: "No widget configured" });
    return;
  }
  res.status(204).end();
});

export default router;
