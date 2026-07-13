# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

Vite + React 18 + TypeScript SPA (shadcn/ui + Tailwind + Radix), React Router, TanStack Query, Zustand. Backend = Supabase (self-hosted, PostgREST) + a small Node HTTP server (`server/index.mjs`) that proxies the Fastrax ERP. Spanish is the primary UI/comment language.

## Commands

```bash
npm run dev              # Vite dev server, port 8080 (strict)
npm run build            # production build
npm run lint             # eslint .
npm run test             # vitest run (jsdom, setup in src/test/setup.ts)
npm run test:watch
npx vitest run path/to/file.test.ts   # single test file
npm run server           # Fastrax mini-backend (Node, port 8787, reads .env.local)
```

DB / migration scripts (require `SUPABASE_DB_URL` or `DIRECT_POSTGRES_URL` in `.env.local`):

```bash
npm run db:schemas       # list non-system schemas
npm run db:tables        # list tables in `enertech` schema (override: SCHEMA=other)
npm run db:migrate:NN    # run supabase/sql/NN_*.sql idempotently and verify
npm run db:import:excel  # bulk import Enertech catalog from Excel
npm run db:validate:catalog
```

Fastrax CLI helpers (server-side only, never bundle):

```bash
npm run fastrax:health | :list | :sku | :sync | :stock | :order | :order-status
```

## Architecture

### Two-surface app

- **Public storefront** (`src/pages/Home|Catalog|ProductDetail|Contact|Nosotros`) under `StoreLayout`. Flow: `/cart` → `/checkout` (captures customer data, persists the order via the `create_guest_order` RPC, opens WhatsApp with the summary) → `/order/sent`. There is no online payment — WhatsApp coordinates pago/entrega. Persisting the order is what enables auto-fulfilment: `server/fastrax-order-dispatcher.mjs` polls new orders with Fastrax lines and sends them to the ERP (ope=12), gated by `FASTRAX_AUTO_DISPATCH` + `FASTRAX_CREATE_REMOTE_ORDERS`.
- **Admin** (`src/pages/admin/*`) under `AdminLayout`, gated by `ProtectedAdminRoute` + `useAdminGate`. Routes: `/admin` (Dashboard), `productos`, `categorias`, `importar`, `fastrax`.

Routing is declared in [src/App.tsx](src/App.tsx); the QueryClient there installs global `QueryCache`/`MutationCache` error logging — don't replace it with a bare `new QueryClient()`.

### Supabase client (single source)

`src/integrations/supabase/client.ts` is the **only** place that calls `createClient`. Two non-obvious points:

- PostgREST is configured against the **`enertech`** schema (not `public`) via `db.schema`. Any new tables/views must be exposed in that schema, or wrapped, to be visible from the browser.
- If `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are missing the client silently falls back to a local Supabase demo URL/anon key so the dev build still boots. Use `isSupabaseConfigured()` / `assertSupabaseConfigured()` before assuming real data is reachable.

Re-export shim at `src/lib/supabase.ts` — import from `@/integrations/supabase/client` or `@/lib/supabase`, never call `createClient` again.

### Services layer

All data access goes through `src/services/*Service.ts` (catalog, orders, settings, store, productEvents, productImport, admin* variants). Pages/components call services; services call Supabase. Don't query Supabase directly from components.

Helpers in `src/lib/`:
- `mapEnertech.ts` — row → domain mapping (the enertech schema has its own column naming)
- `categoryHierarchy.ts` — two-level category logic (see migration 13)
- `pricing.ts`, `slug.ts`, `postgrestError.ts`, `visitorId.ts`
- `cartWhatsApp.ts` + `brandAssets.ts` — WhatsApp checkout message + brand info

### Fastrax integration (two layers)

Fastrax is a remote ERP. Credentials (`FASTRAX_COD`, `FASTRAX_PASS`, ...) **must never** be prefixed `VITE_` — they would ship to the browser.

- `scripts/fastrax/*.mjs` — Node CLI + library: `client.mjs` (HTTP), `mapper.mjs`, `sync-core.mjs` (`runProductSync`, `runStockSync`), `db.mjs` (Postgres upsert), `env.mjs` (loads `.env.local`).
- `server/index.mjs` + `server/fastrax-auth.mjs` — tiny dependency-free HTTP backend on `FASTRAX_BACKEND_PORT` (default 8787). Endpoints `/api/fastrax/{health,sync,stock}` require a Supabase admin JWT (verified by `verifyAdmin`) and default to **dry-run** unless `apply: true` is passed. Sending real orders to Fastrax also requires `FASTRAX_CREATE_REMOTE_ORDERS=1`.
- Admin UI at `/admin/fastrax` calls this backend via `VITE_FASTRAX_BACKEND_URL` using the user's Supabase JWT (`adminFastraxSyncService.ts`).

### Database / SQL

- Migrations live in `supabase/sql/NN_*.sql`, numbered, idempotent (`IF NOT EXISTS`, ...). Run via the `db:migrate:NN` scripts in `package.json`, which execute the file and then run verification queries.
- DBA workflow and connection-string rules are in [docs/DBA.md](docs/DBA.md) and [.cursor/rules/dba-postgresql.mdc](.cursor/rules/dba-postgresql.mdc) — relevant points:
  - **DDL goes through a direct `pg` connection**, not PostgREST. Prefer `SUPABASE_DB_URL` (owner role); `DIRECT_POSTGRES_URL` (Supavisor pooler) often lacks `ALTER` privileges.
  - Supavisor user must be `postgres.<tenant-id>`, not bare `postgres`.
  - Sequence for any schema change: inspect → validate existence → idempotent SQL → execute → verify → summarize.
  - Destructive operations (`DROP TABLE/COLUMN`, mass deletes) require explicit confirmation.
- Server hosts multiple per-company schemas; default working schema is **`enertech`**. Don't assume `public`.

### Path alias

`@/` → `src/` (configured in `vite.config.ts`, `tsconfig.json`, `vitest.config.ts`). React/Query packages are deduped in `vite.config.ts` — don't add second copies.

## Testing

Vitest + Testing Library, jsdom env. Tests colocated as `*.test.ts(x)` under `src/`. Smoke test for the router/QueryClient wiring lives at [src/App.smoke.test.tsx](src/App.smoke.test.tsx).
