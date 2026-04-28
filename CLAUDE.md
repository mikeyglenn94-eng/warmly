# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Warmly** — WhatsApp click-to-chat with a smart pre-fill form. Part of the **Firstsetweb** product family; will eventually live at `firstsetweb.com/warmly`.

The pitch: a website visitor lands on a Warmly form page, answers 1–5 multi-choice questions, and lands in WhatsApp with a pre-filled, qualifying message ready to send. The operator (a solo small-business owner) configures the form in a dashboard and shares a single link.

**Architecture is link-only, not embedded.** There is no JS bundle to drop into a customer's site. The operator shares a URL like `firstsetweb.com/warmly/<slug>`; the dashboard renders both the operator config UI and the public form pages.

## Workspace layout

pnpm monorepo. Workspace globs in `pnpm-workspace.yaml`:

- `artifacts/*` — runnable apps
- `lib/*` — shared libraries

### Apps (`artifacts/`)
- **`api-server`** *(scaffolded — auth + widget CRUD)* — Express 5 + TypeScript backend, run via `tsx`. Endpoints: `GET /health`, `POST /auth/signup`, `POST /auth/login`, auth-gated widget CRUD (`POST /widgets`, `GET /widgets`, `GET/PUT/DELETE /widgets/:id`), and the public lookup `GET /widgets/public/:slug`. JWT auth via `Authorization: Bearer …` (7-day expiry). Lazy db singleton in `src/db.ts`.
- **`dashboard`** *(planned)* — Vite + React + TypeScript SPA. Two surfaces in one app:
  - **Operator surface** (auth-gated): signup/login + widget config page (questions builder, message template, button styling, slug, copy-link button).
  - **Public surface** (`/warmly/<slug>`, no auth): renders the multi-choice form, builds the `wa.me` URL with the encoded message, opens WhatsApp.

### Shared libs (`lib/`)
- **`api-spec`** *(scaffolded)* — Zod schemas. Widget primitives (`AnswerSchema`, `QuestionSchema`, `WidgetConfigSchema`, `SlugSchema`, `WhatsAppNumberSchema`, `HexColourSchema`). Auth (`SignupRequestSchema`, `LoginRequestSchema`, `AuthResponseSchema`). Widget API (`CreateWidgetRequestSchema`, `UpdateWidgetRequestSchema`, `WidgetResponseSchema`, `PublicWidgetResponseSchema`). Source of truth for shared types.
- **`db`** *(scaffolded)* — Drizzle ORM with `postgres-js`. `users` and `widgets` tables. `widgets.slug` is the public URL identifier (unique, operator-editable); `widgets.id` is the internal stable PK (uuid). `widgets.questions` is jsonb typed via `@warmly/api-spec`'s `Question[]`. Exports `createDb(url)` and a `schema` namespace.

### Stack at a glance
- **Database:** PostgreSQL (Neon in production), Drizzle ORM, `postgres-js` driver.
- **Auth:** JWT, 7-day expiry, bcryptjs for password hashing. Secret via `JWT_SECRET` env.
- **Package manager:** pnpm. The root `preinstall` guard rejects npm and yarn.
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
- `pnpm --filter @warmly/db push` — `drizzle-kit push` against `DATABASE_URL`. Reads from process env at invocation time (e.g. `DATABASE_URL=… pnpm --filter @warmly/db push`).

## API quick reference

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | — | Health check |
| POST | `/auth/signup` | — | Create user, return JWT |
| POST | `/auth/login` | — | Verify credentials, return JWT |
| POST | `/widgets` | Bearer | Create widget (slug + config) |
| GET | `/widgets` | Bearer | List widgets owned by caller |
| GET | `/widgets/:id` | Bearer | Get one widget by internal id |
| PUT | `/widgets/:id` | Bearer | Update widget |
| DELETE | `/widgets/:id` | Bearer | Delete widget |
| GET | `/widgets/public/:slug` | — | Public read by slug (sanitised — no userId, no internal ids) |

Ownership leaks are avoided by returning 404 (not 403) on widget routes when the caller is authenticated but isn't the owner.

## Conventions

- The dashboard handles both operator config and public form rendering — same SPA, two route trees. They share types via `lib/api-spec` but should keep UI components separate so the public bundle stays small.
- The slug is the canonical public identifier. The internal `id` (uuid) is for stable references inside the operator surface only.
- Email is normalised to lowercase before hashing/storage. Don't compare emails case-sensitively.
- Validate every API request body via the Zod schemas in `@warmly/api-spec`. Return `{ error, issues }` on failure.
