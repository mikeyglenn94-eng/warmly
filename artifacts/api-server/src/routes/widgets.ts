import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { widgetsTable, type Widget } from "@warmly/db";
import {
  CreateWidgetRequestSchema,
  UpdateWidgetRequestSchema,
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
    whatsappNumber: w.whatsappNumber,
    questions: w.questions,
    messageTemplate: w.messageTemplate,
    buttonColour: w.buttonColour,
    buttonPosition: w.buttonPosition === "bottom-left" ? "bottom-left" : "bottom-right",
    brandingEnabled: w.brandingEnabled,
  };
}

// ── Public read by slug (no auth) ──────────────────────────────────────────
// Defined BEFORE the auth-gated /:id route so /widgets/public/:slug is matched
// first and not swallowed by the param route.
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

// ── Auth-gated CRUD ────────────────────────────────────────────────────────

router.post("/widgets", requireAuth, async (req, res) => {
  const parsed = CreateWidgetRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid widget payload", issues: parsed.error.issues });
    return;
  }
  const userId = req.user!.userId;
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

router.get("/widgets", requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const rows = await db()
    .select()
    .from(widgetsTable)
    .where(eq(widgetsTable.userId, userId));
  res.json(rows.map(toWidgetResponse));
});

router.get("/widgets/:id", requireAuth, async (req, res) => {
  const id = req.params["id"];
  const userId = req.user!.userId;
  if (!id) {
    res.status(404).json({ error: "Widget not found" });
    return;
  }
  const [row] = await db()
    .select()
    .from(widgetsTable)
    .where(and(eq(widgetsTable.id, id), eq(widgetsTable.userId, userId)))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "Widget not found" });
    return;
  }
  res.json(toWidgetResponse(row));
});

router.put("/widgets/:id", requireAuth, async (req, res) => {
  const id = req.params["id"];
  const userId = req.user!.userId;
  if (!id) {
    res.status(404).json({ error: "Widget not found" });
    return;
  }
  const parsed = UpdateWidgetRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid widget payload", issues: parsed.error.issues });
    return;
  }
  const updates = parsed.data;

  if (updates.slug) {
    const [taken] = await db()
      .select({ id: widgetsTable.id })
      .from(widgetsTable)
      .where(eq(widgetsTable.slug, updates.slug))
      .limit(1);
    if (taken && taken.id !== id) {
      res.status(409).json({ error: "Slug already taken" });
      return;
    }
  }

  const [row] = await db()
    .update(widgetsTable)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(widgetsTable.id, id), eq(widgetsTable.userId, userId)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Widget not found" });
    return;
  }
  res.json(toWidgetResponse(row));
});

router.delete("/widgets/:id", requireAuth, async (req, res) => {
  const id = req.params["id"];
  const userId = req.user!.userId;
  if (!id) {
    res.status(404).json({ error: "Widget not found" });
    return;
  }
  const deleted = await db()
    .delete(widgetsTable)
    .where(and(eq(widgetsTable.id, id), eq(widgetsTable.userId, userId)))
    .returning({ id: widgetsTable.id });
  if (deleted.length === 0) {
    res.status(404).json({ error: "Widget not found" });
    return;
  }
  res.status(204).end();
});

export default router;
