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
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type WidgetResponse = z.infer<typeof WidgetResponseSchema>;

// Public response — no userId, no internal ids beyond what the public form
// page needs to render. The slug is implicit (it's the URL).
export const PublicWidgetResponseSchema = WidgetConfigSchema;
export type PublicWidgetResponse = z.infer<typeof PublicWidgetResponseSchema>;
