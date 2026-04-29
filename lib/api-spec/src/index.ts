import { z } from "zod";

// ── Widget config primitives ───────────────────────────────────────────────

export const AnswerSchema = z.object({
  text: z.string().min(1).max(80),
  snippet: z.string().min(1).max(200),
});
export type Answer = z.infer<typeof AnswerSchema>;

export const QuestionSchema = z.object({
  text: z.string().min(1).max(120),
  answers: z.array(AnswerSchema).min(2).max(4),
});
export type Question = z.infer<typeof QuestionSchema>;

export const ButtonPositionSchema = z.enum(["bottom-right", "bottom-left"]);
export type ButtonPosition = z.infer<typeof ButtonPositionSchema>;

export const HexColourSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Must be a 6-digit hex colour, e.g. #25D366");

// Permissive E.164: optional leading +, then 7–15 digits with no leading 0.
export const WhatsAppNumberSchema = z
  .string()
  .regex(/^\+?[1-9]\d{6,14}$/, "Must be an international phone number, e.g. +447700900000");

// Public URL identifier. Lowercase a–z, digits, hyphens. 3–40 chars. No
// leading or trailing hyphen, no consecutive hyphens.
export const SlugSchema = z
  .string()
  .min(3)
  .max(40)
  .regex(
    /^[a-z0-9](?:[a-z0-9]|-(?!-))*[a-z0-9]$/,
    "Slug must be lowercase letters, digits, and hyphens (no leading, trailing, or doubled hyphens)",
  );

export const WidgetConfigSchema = z.object({
  whatsappNumber: WhatsAppNumberSchema,
  questions: z.array(QuestionSchema).min(1).max(5),
  messageTemplate: z.string().min(1).max(2000),
  buttonColour: HexColourSchema.default("#25D366"),
  buttonPosition: ButtonPositionSchema.default("bottom-right"),
  brandingEnabled: z.boolean().default(true),
});
export type WidgetConfig = z.infer<typeof WidgetConfigSchema>;

// Patch shape for the pause toggle. Other partial updates go through
// UpdateWidgetRequestSchema below.
export const WidgetPatchSchema = z.object({
  active: z.boolean().optional(),
});
export type WidgetPatch = z.infer<typeof WidgetPatchSchema>;

// ── Auth ───────────────────────────────────────────────────────────────────

export const EmailSchema = z.string().email().max(254);
export const PasswordSchema = z.string().min(8).max(128);

export const SignupRequestSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
});
export type SignupRequest = z.infer<typeof SignupRequestSchema>;

export const LoginRequestSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1).max(128),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const AuthUserSchema = z.object({
  id: z.number().int().positive(),
  email: EmailSchema,
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

export const AuthResponseSchema = z.object({
  token: z.string(),
  user: AuthUserSchema,
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

// ── Widget API request/response shapes ─────────────────────────────────────

export const CreateWidgetRequestSchema = WidgetConfigSchema.extend({
  slug: SlugSchema,
});
export type CreateWidgetRequest = z.infer<typeof CreateWidgetRequestSchema>;

export const UpdateWidgetRequestSchema = WidgetConfigSchema.partial().extend({
  slug: SlugSchema.optional(),
});
export type UpdateWidgetRequest = z.infer<typeof UpdateWidgetRequestSchema>;

export const WidgetResponseSchema = WidgetConfigSchema.extend({
  id: z.string(),
  slug: SlugSchema,
  active: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type WidgetResponse = z.infer<typeof WidgetResponseSchema>;

// Public response — no userId, no internal ids beyond what the public form
// page needs to render. The slug is implicit (it's the URL). `active` is
// included so the public form can show a "currently not taking enquiries"
// state without an extra request.
export const PublicWidgetResponseSchema = WidgetConfigSchema.extend({
  active: z.boolean(),
});
export type PublicWidgetResponse = z.infer<typeof PublicWidgetResponseSchema>;

// ── Admin ──────────────────────────────────────────────────────────────────
// Hardcoded allowlist for v1 — single source of truth, consumed by both the
// api-server's admin route guard and (transitively, via api responses) the
// dashboard. Emails are normalised to lowercase on signup/login so the
// stored side is always lowercase; isAdminEmail also lowercases the input
// for safety.

export const ADMIN_EMAILS: readonly string[] = ["mikeyglenn94@gmail.com"];

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export const AdminUserWidgetSchema = z.object({
  slug: SlugSchema,
  whatsappNumber: z.string(),
  active: z.boolean(),
  updatedAt: z.string(),
});
export type AdminUserWidget = z.infer<typeof AdminUserWidgetSchema>;

export const AdminUserRowSchema = z.object({
  id: z.number().int().positive(),
  email: EmailSchema,
  createdAt: z.string(),
  widget: AdminUserWidgetSchema.nullable(),
});
export type AdminUserRow = z.infer<typeof AdminUserRowSchema>;
