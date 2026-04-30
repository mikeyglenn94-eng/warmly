# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Warmly** — WhatsApp click-to-chat with a smart pre-fill form. Part of the **Firstsetweb** product family; will eventually live at `firstsetweb.com/warmly`.

The pitch: a website visitor lands on a Warmly form page, answers 1–5 multi-choice questions, and lands in WhatsApp with a pre-filled, qualifying message ready to send. The operator (a solo small-business owner) configures the form in a dashboard and shares a single link.

**Architecture is link-only, not embedded.** There is no JS bundle to drop into a customer's site. The operator shares a URL like `firstsetweb.com/warmly/<slug>`; the dashboard renders both the operator config UI and the public form pages. **v1 is one widget per user**, enforced at the application layer (the schema is permissive so we can relax this later).

## Workspace layout

pnpm monorepo. Workspace globs in `pnpm-workspace.yaml`:

- `artifacts/*` — runnable apps
- `lib/*` — shared libraries

### Apps (`artifacts/`)

- **`api-server`** *(scaffolded — auth + widget CRUD)* — Express 5 + TypeScript backend, run via `tsx`. Endpoints: `GET /health`, `POST /auth/signup`, `POST /auth/login`, the `/widgets/me` family (auth-gated), and the public `GET /widgets/public/:slug`. JWT auth via `Authorization: Bearer …` (7-day expiry). Lazy db singleton in `src/db.ts`.

- **`dashboard`** *(scaffolded)* — Vite + React 19 + TypeScript SPA. Two route trees in one app:
  - **Operator surface** (`/login`, `/signup`, `/app`, auth-gated): the form builder with live preview, pause/reactivate, slug + WhatsApp number, button styling. Loads `/widgets/me` on mount; empty state if 404; saves via POST (first time) or PUT.
  - **Public surface** (`/m/:slug`, no auth): fetches `/widgets/public/:slug`, renders the multi-choice `FormShell`, builds the `wa.me` URL **client-side** with the encoded message, then `window.location.assign`s to it. Skip link uses a generic fallback ("Hi, I came from your website"). Paused widgets show a "currently not taking enquiries" page.

### Shared libs (`lib/`)

- **`api-spec`** *(scaffolded)* — Zod schemas. Widget primitives (`AnswerSchema`, `QuestionSchema`, `WidgetConfigSchema`, `SlugSchema`, `WhatsAppNumberSchema`, `HexColourSchema`, `WidgetPatchSchema`). Auth (`SignupRequestSchema`, `LoginRequestSchema`, `AuthResponseSchema`). Widget API (`CreateWidgetRequestSchema`, `UpdateWidgetRequestSchema`, `WidgetResponseSchema` (includes `active`), `PublicWidgetResponseSchema` (sanitised, includes `active`)).
- **`db`** *(scaffolded)* — Drizzle ORM with `postgres-js`. `users` and `widgets` tables. `widgets` has both `id` (uuid PK, internal) and `slug` (unique text, public URL). `widgets.active` boolean for pause. `widgets.questions` is jsonb typed via `@warmly/api-spec`'s `Question[]`. Exports `createDb(url)` and a `schema` namespace.

### Stack at a glance

- **Database:** PostgreSQL (Neon in production), Drizzle ORM, `postgres-js` driver.
- **Auth:** JWT, 7-day expiry, bcryptjs for password hashing. Secret via `JWT_SECRET` env.
- **Frontend:** React 19 + Vite, React Router v6. No CSS framework — plain CSS + design tokens in `src/styles/tokens.css`.
- **Package manager:** pnpm. The root `preinstall` guard rejects npm and yarn (cross-platform via `node -e`).
- **TypeScript:** Project references via `tsc --build` for libs; `customConditions: ["workspace"]` lets consumers import source TS directly from sibling packages, no build step required.

## Commands

From the repo root:

- `pnpm install` — install all workspace deps and link workspace packages.
- `pnpm typecheck` — `tsc --build` for libs (project refs) then per-artifact typecheck.
- `pnpm typecheck:libs` — just the lib project references.
- `pnpm build` — typecheck then run `build` in any package that defines one.

Per-package:

- `pnpm --filter @warmly/api-server dev` — start the API on `PORT` (default `3000`) with `tsx watch`. Requires a `.env` (copy from `artifacts/api-server/.env.example`) with `DATABASE_URL` and `JWT_SECRET`.
- `pnpm --filter @warmly/api-server start` — same but no watch.
- `pnpm --filter @warmly/api-server build` — chains the dashboard build then copies its `dist/` into `artifacts/api-server/public/`. Used for production deploys (Replit, etc.) where api-server serves the SPA and the API from one origin.
- `pnpm --filter @warmly/dashboard dev` — start the Vite dev server on `:5173`. Reads `VITE_API_URL` from `.env` (set to `http://localhost:3000` in `.env.example` for cross-origin local dev).
- `pnpm --filter @warmly/dashboard build` — typecheck then production Vite build.
- `pnpm db:generate` — generate a SQL migration from current schema diff. Output goes to `lib/db/drizzle/`. Does not connect to a database.
- `pnpm db:migrate` — apply pending migrations against `DATABASE_URL`. Used by Replit's deploy build, not run by hand.
- `pnpm db:push` — `drizzle-kit push`. **Local dev only.** Never run against prod.

## Migrations

Production schema changes happen by **deploying code**, never by running a command against prod. The flow:

1. Edit schema files in `lib/db/src/schema/`.
2. `pnpm db:generate` — creates a new `lib/db/drizzle/NNNN_*.sql` file plus a `meta/` snapshot update. Inspect the SQL.
3. Commit the schema change and the generated SQL together.
4. Push to `main`. Replit's deploy build runs `pnpm db:migrate` before starting the server, so the migration applies against prod's `DATABASE_URL` (set in Replit's deployment env). Build/migrate failure aborts the deploy — the old server keeps running.

**`pnpm db:push` stays available for local-only WIP iteration** where generating a migration for every fiddle is overkill. Never push against prod — that's the failure mode this workflow exists to eliminate.

**Baseline migration (`0000_reflective_red_wolf.sql`)** is hand-edited to be idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, FK in a `DO $$ … EXCEPTION WHEN duplicate_object` block). This was a one-time bootstrap so the first deploy against the existing prod schema is a safe no-op while still creating everything from scratch on a fresh DB. **Future migrations are generated normally and should not be hand-edited for idempotency.**

drizzle-kit tracks applied migrations in a `__drizzle_migrations__` table (auto-created on first `migrate` run). Each migration runs in a transaction, so a failed statement rolls back cleanly.

## Deployment

**Single-origin in production.** After `pnpm --filter @warmly/api-server build`, the api-server serves the dashboard from `artifacts/api-server/public` alongside the API. A catch-all middleware sends `index.html` for any GET that isn't `/health`, `/auth/*`, `/widgets/*`, `/admin/*`, `/me`, or `/billing/*`, so React Router handles client-side routing. Add new top-level API prefixes to `isApiPath()` in `artifacts/api-server/src/index.ts` so they don't get swallowed by the SPA fallback.

The dashboard's API client defaults to **same-origin** (empty base URL) when `VITE_API_URL` is unset — production needs no env-var gymnastics. Local dev with the Vite dev server is the only place `VITE_API_URL` matters; the example sets it to `http://localhost:3000`.

## API quick reference

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | — | Health check |
| POST | `/auth/signup` | — | Create user, return JWT |
| POST | `/auth/login` | — | Verify credentials, return JWT |
| GET | `/widgets/me` | Bearer | Caller's widget; 404 if none yet |
| POST | `/widgets/me` | Bearer | Create caller's widget (409 if one exists) |
| PUT | `/widgets/me` | Bearer | Replace widget config (409 on slug clash) |
| PATCH | `/widgets/me` | Bearer | Partial update — currently `{ active: boolean }` for pause |
| DELETE | `/widgets/me` | Bearer | Delete the widget |
| GET | `/widgets/public/:slug` | — | Public read by slug (sanitised). Returns **402** if the operator isn't on a paid plan |
| GET | `/me` | Bearer | Caller's user with `isPaid`, `subscriptionStatus`, `planActiveUntil` |
| POST | `/billing/create-checkout-session` | Bearer | Stripe Checkout (subscription mode); returns `{ url }` |
| POST | `/billing/create-portal-session` | Bearer | Stripe Billing Portal (cancel / update card); returns `{ url }` |
| POST | `/billing/webhook` | Stripe-signed | Subscription lifecycle events (raw body, signature verified) |

Ownership leaks are avoided by returning 404 (not 403) on widget routes when the caller is authenticated but isn't the owner.

## Billing

**Free vs paid:** building, editing, and previewing the form are free. The public form at `/m/:slug` only serves once the operator's subscription is active (£8/month). Server-side, `GET /widgets/public/:slug` joins `users` and returns `402` if `isPaid(user) === false`. Client-side, the dashboard fetches `/me` on `/app` mount and shows a "preview mode" banner + redirects "Copy public link" to `/app/upgrade` until the user pays.

**Source of truth for billing state:** Stripe webhooks. `subscriptionStatus` and `planActiveUntil` on `users` are written only by `/billing/webhook` in response to `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, and `invoice.payment_failed`. The `?upgrade=success` query param is just a UX hint; the dashboard refetches `/me` a couple of times after that lands so the banner clears once the webhook arrives.

**Webhook plumbing:** `/billing/webhook` is mounted with `express.raw({ type: 'application/json' })` *before* the global `express.json()` middleware in `src/index.ts`, so the Stripe SDK can verify the signature against the raw bytes.

**isPaid logic** (server `src/lib/billing.ts`): `subscriptionStatus === 'active'` OR (`'past_due'` AND `planActiveUntil > now`). `trialing` is normalised to `active`; `incomplete` and `unpaid` to `past_due`; `canceled` and `incomplete_expired` to `canceled`.

**Required env vars** on the api-server: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`. Statement descriptor for subscriptions is configured in the Stripe dashboard at Settings → Public details, not per-session — set it to "WARMLY" there.

## Conventions

- **One widget per user** is an application-layer rule. The `widgets` table doesn't carry a unique constraint on `userId` — relaxing this later (multiple widgets per account) won't require a migration.
- The slug is the canonical public identifier. The internal `id` (uuid) is for stable references inside the operator surface only.
- Email is normalised to lowercase before hashing/storage. Don't compare emails case-sensitively.
- Validate every API request body via the Zod schemas in `@warmly/api-spec`. Return `{ error, issues }` on failure.
- **wa.me URL is built client-side** in `dashboard/src/lib/wa-message.ts` (`renderMessage` + `buildWaUrl`). v1 has no lead capture or analytics, so there's no server-side reason to round-trip a submit.
- **Slug uniqueness** is checked at save time only — the dashboard surfaces the 409 conflict from the server. There is no separate availability-check endpoint.
- **Design tokens** live in `dashboard/src/styles/tokens.css` (cream + ink + warm orange palette, blue accents, WhatsApp green reserved as the final-CTA only). The original handoff source files live outside the repo at `~/Documents/Warmly Design/` and are gitignored under `design/`.
- **Sentence case copy throughout.** No em-dashes in user-facing UI text.
