-- Remediation migration. The baseline (0000) used CREATE TABLE IF NOT EXISTS,
-- which is a no-op for tables that already existed but were missing columns
-- (the prod users table predated the four Stripe columns). This migration
-- backfills those columns idempotently — no-op on databases that already
-- match the baseline snapshot. Hand-authored, not generated, because the
-- schema files match snapshot 0000 so drizzle-kit generate produces no diff.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "stripe_subscription_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "subscription_status" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "plan_active_until" timestamp with time zone;
