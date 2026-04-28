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
- `pnpm --filter @warmly/dashboard dev` — start the Vite dev server on `:5173`. Reads `VITE_API_URL` from `.env` (defaults to `http://localhost:3000`).
- `pnpm --filter @warmly/dashboard build` — typecheck then production Vite build.
- `pnpm --filter @warmly/db push` — `drizzle-kit push` against `DATABASE_URL`. Reads from process env at invocation time.

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
| GET | `/widgets/public/:slug` | — | Public read by slug (sanitised) |

Ownership leaks are avoided by returning 404 (not 403) on widget routes when the caller is authenticated but isn't the owner.

## Conventions

- **One widget per user** is an application-layer rule. The `widgets` table doesn't carry a unique constraint on `userId` — relaxing this later (multiple widgets per account) won't require a migration.
- The slug is the canonical public identifier. The internal `id` (uuid) is for stable references inside the operator surface only.
- Email is normalised to lowercase before hashing/storage. Don't compare emails case-sensitively.
- Validate every API request body via the Zod schemas in `@warmly/api-spec`. Return `{ error, issues }` on failure.
- **wa.me URL is built client-side** in `dashboard/src/lib/wa-message.ts` (`renderMessage` + `buildWaUrl`). v1 has no lead capture or analytics, so there's no server-side reason to round-trip a submit.
- **Slug uniqueness** is checked at save time only — the dashboard surfaces the 409 conflict from the server. There is no separate availability-check endpoint.
- **Design tokens** live in `dashboard/src/styles/tokens.css` (cream + ink + warm orange palette, blue accents, WhatsApp green reserved as the final-CTA only). The original handoff source files live outside the repo at `~/Documents/Warmly Design/` and are gitignored under `design/`.
- **Sentence case copy throughout.** No em-dashes in user-facing UI text.
