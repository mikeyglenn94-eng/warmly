import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { usersTable } from "@warmly/db";
import { SignupRequestSchema, LoginRequestSchema } from "@warmly/api-spec";
import { db } from "../db";
import { signJwt } from "../lib/jwt";
import { withErrors } from "../lib/errors";

const router: IRouter = Router();

router.post(
  "/auth/signup",
  withErrors("auth/signup", async (req, res) => {
    const parsed = SignupRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid signup payload", issues: parsed.error.issues });
      return;
    }
    const { email, password } = parsed.data;
    const normalisedEmail = email.toLowerCase();

    const existing = await db()
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, normalisedEmail))
      .limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "Email already in use" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [row] = await db()
      .insert(usersTable)
      .values({ email: normalisedEmail, passwordHash })
      .returning({ id: usersTable.id, email: usersTable.email });
    if (!row) {
      res.status(500).json({ error: "Failed to create user" });
      return;
    }

    const token = signJwt({ userId: row.id, email: row.email });
    res.status(201).json({ token, user: row });
  }),
);

router.post(
  "/auth/login",
  withErrors("auth/login", async (req, res) => {
    const parsed = LoginRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid login payload", issues: parsed.error.issues });
      return;
    }
    const { email, password } = parsed.data;
    const normalisedEmail = email.toLowerCase();

    const [user] = await db()
      .select({ id: usersTable.id, email: usersTable.email, passwordHash: usersTable.passwordHash })
      .from(usersTable)
      .where(eq(usersTable.email, normalisedEmail))
      .limit(1);
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = signJwt({ userId: user.id, email: user.email });
    res.json({ token, user: { id: user.id, email: user.email } });
  }),
);

export default router;
