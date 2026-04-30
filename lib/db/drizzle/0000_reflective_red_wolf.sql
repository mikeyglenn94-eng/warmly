-- Baseline migration. Hand-edited to be idempotent so the first prod deploy
-- against the existing schema is a safe no-op (records the migration hash in
-- __drizzle_migrations__ without recreating tables) while still creating
-- everything from scratch on a fresh database. Future migrations are
-- generated normally and DO NOT need this treatment.
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"subscription_status" text,
	"plan_active_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "widgets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"slug" text NOT NULL,
	"whatsapp_number" text NOT NULL,
	"questions" jsonb NOT NULL,
	"message_template" text NOT NULL,
	"button_colour" text DEFAULT '#25D366' NOT NULL,
	"button_position" text DEFAULT 'bottom-right' NOT NULL,
	"branding_enabled" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "widgets" ADD CONSTRAINT "widgets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "widgets_user_idx" ON "widgets" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "widgets_slug_idx" ON "widgets" USING btree ("slug");
