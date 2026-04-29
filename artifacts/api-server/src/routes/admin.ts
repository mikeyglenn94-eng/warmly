import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { isAdminEmail, type AdminUserRow } from "@warmly/api-spec";
import { usersTable, widgetsTable } from "@warmly/db";
import { db } from "../db";
import { requireAuth } from "../middleware/require-auth";

const router: IRouter = Router();

// Admin-only view of every user + their widget (if any). Single endpoint
// for v1; if more admin endpoints arrive, factor the allowlist check into
// a requireAdmin middleware.
router.get("/admin/users", requireAuth, async (req, res) => {
  if (!isAdminEmail(req.user!.email)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const rows = await db()
    .select()
    .from(usersTable)
    .leftJoin(widgetsTable, eq(usersTable.id, widgetsTable.userId))
    .orderBy(desc(usersTable.createdAt));

  const out: AdminUserRow[] = rows.map((r) => ({
    id: r.users.id,
    email: r.users.email,
    createdAt: r.users.createdAt.toISOString(),
    widget: r.widgets
      ? {
          slug: r.widgets.slug,
          whatsappNumber: r.widgets.whatsappNumber,
          active: r.widgets.active,
          updatedAt: r.widgets.updatedAt.toISOString(),
        }
      : null,
  }));

  res.json(out);
});

export default router;
