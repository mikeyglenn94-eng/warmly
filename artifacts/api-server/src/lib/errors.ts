import type { Request, Response } from "express";

// Stripe SDK errors come through with a `type` field like
// "StripeInvalidRequestError" / "StripeAPIError" / "StripeAuthenticationError".
// Shape-check rather than instanceof so we don't have to import the Stripe
// runtime class.
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
// stripped. For everything else we return `{ error: err.message }` (or
// "Internal error" for non-Error throws). Use a label like
// "billing/create-checkout-session" so a single grep finds the line in
// logs.
export function withErrors(
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
