# Forest Risk & Wildlife Tracker

Software-only forest intelligence dashboard that combines satellite-style risk monitoring with wildlife and vegetation observations and forest department response alerts.

## Run & Operate

- `pnpm run dev` — start both API server (port 5000) and Web Dashboard (port 3000) simultaneously
- `pnpm run dev:api` — run the API server (port 5000)
- `pnpm run dev:web` — run the React dashboard (port 3000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (when using external PostgreSQL)
- Optional env: `DATABASE_URL` — Postgres connection string (if not set, embedded PGlite is used automatically)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/forest-risk-tracker/` — React dashboard and responsive route views
- `artifacts/api-server/src/routes/forest.ts` — forest monitoring API and starter dataset seeding
- `lib/api-spec/openapi.yaml` — source of truth for monitoring endpoints and generated client hooks
- `lib/db/src/schema/forest.ts` — persistent risk zones, observations, alerts, and activity tables
- `artifacts/forest-risk-tracker/src/index.css` — visual theme and app tokens

## Architecture decisions

- The first release uses a persistent local dataset shaped like satellite-derived signals so the product is useful without requiring hardware or provider credentials.
- The backend owns alert status and observation creation; dashboard mutations invalidate the corresponding React Query caches.
- Satellite risk zones, wildlife observations, vegetation observations, and forest alerts are separate API resources so real providers can be connected later without changing the UI contract.

## Product

- Live overview of monitored area, high-risk zones, active alerts, wildlife signals, and vegetation trend.
- Risk-zone browser with wildfire, deforestation, and ecological risk types.
- Wildlife and vegetation observation log with confidence and source metadata.
- Forest department response queue with open, acknowledged, and resolved statuses.
- Preferences screen for notification and monitoring settings.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after editing `lib/api-spec/openapi.yaml`.
- Standalone Vite builds need `PORT` and `BASE_PATH`; managed preview workflows provide them automatically.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
