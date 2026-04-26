import { z } from "zod";

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

export const WidgetConfigSchema = z.object({
  whatsappNumber: WhatsAppNumberSchema,
  questions: z.array(QuestionSchema).min(1).max(5),
  messageTemplate: z.string().min(1).max(2000),
  buttonColour: HexColourSchema.default("#25D366"),
  buttonPosition: ButtonPositionSchema.default("bottom-right"),
  brandingEnabled: z.boolean().default(true),
});
export type WidgetConfig = z.infer<typeof WidgetConfigSchema>;
