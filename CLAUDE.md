# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

DriveEase — a car-insurance policy management system (车辆保单管理系统). UI text, domain strings, and DB enum values are **Chinese**; code identifiers are English. All user-facing strings should be Chinese.

## Commands

Two frontends coexist during the React → Vue-Vben migration. `client/` (React, npm) + `server/` form an npm **workspaces** monorepo needing **Node 18+ / npm 9+**; `client-vue/` (Vue-Vben Admin v5) is a **separate pnpm monorepo** needing **Node 22.18+/24 + pnpm 11+** (enable via corepack). Run root scripts with the `-w` flag:

```bash
# client/ + server/ (current production frontend + backend)
npm install                  # install client + server workspaces at once
npm run seed   -w server     # (re)initialize DB + demo data  — run before first dev
npm run dev    -w server     # backend dev (node --watch), port 3001
npm run dev    -w client     # client/ frontend dev (Vite), port 5173 — separate terminal
npm run build  -w client     # production build → client/dist/
npm run start  -w server     # production server (also serves client/dist)

# client-vue/ (new frontend, in migration — run from client-vue/)
pnpm install                 # install the pnpm monorepo
pnpm dev:antd                # dev server, port 5666, proxies /api → :3001
pnpm build:antd              # build → apps/web-antd/dist/  (set VITE_GLOB_API_URL=/api in .env.production first)
```

There is **no test runner and no linter** configured — do not invent `npm test` / `npm run lint` commands.

To reset all data: delete `server/database.sqlite`, then `npm run seed -w server`. (The sqlite file is gitignored, so a fresh clone has no data until you seed.) **`npm run seed` is itself destructive** — `seed.js` `DELETE`s every table (and clears `sqlite_sequence`) before re-inserting demo data, so never run it against a DB whose data you want to keep.

## Architecture

### Database is sql.js, not a normal SQLite binding — read this carefully
`server/src/database.js` uses `sql.js` (SQLite compiled to WASM). This has a critical, non-obvious consequence: **the entire database is loaded into memory on boot and the whole file is rewritten to disk on every write.** `run()` calls `save()` automatically; `all`/`get` do not write. Do not call raw `db.run(...)` from route code — go through the `all`/`get`/`run` helpers so persistence happens.

Exposed helpers (import from `../database.js`):
- `all(sql, params)` / `get(sql, params)` — read; `get` returns first row or `null`.
- `run(sql, params)` — write; auto-persists; returns `{ lastInsertRowid }`.
- `log({ operator, action, target, detail }, result = '成功')` — append to `operation_log` (audit). Call it on every create/update/delete in routes (see existing routes for the pattern). The optional second arg is the outcome (`'成功'`/`'失败'`), stored in `operation_log.result`.

### Schema & migrations
Schema is defined inline in `initDB()` via `CREATE TABLE IF NOT EXISTS`. There is no migration tool.
- **Additive** column changes use `ensureColumn(table, column, type)` (adds via `ALTER TABLE` if missing) — preferred for new fields.
- Enum columns use `CHECK(... IN (...))` with **Chinese literal values** (e.g. policy status `'生效'/'待生效'/'已过期'/'已退保'`, user role `'管理员'/'普通员工'`). Adding a new enum value means updating the CHECK constraint, which SQLite can't alter in place — the practical path is dropping the table + re-seed, or a new column.
- Some tables carry dual/legacy fields (e.g. `policy` has both `start_date/end_date` and `effective_date/expiry_date`; routes reconcile them with `effective_date || start_date`).
- `policy.compulsory_detail` / `policy.commercial_detail` are TEXT columns holding **JSON-stringified** arrays of coverage items — routes `JSON.stringify(...)` on write and the frontend parses on read. Apply the same pattern whenever structured data must fit a TEXT column.

### Backend (Express, ESM)
`server/src/app.js` registers one router per resource under `/api/*` and, in production, serves `client/dist` with an SPA fallback (`get('*')` → `index.html`). Port is `process.env.PORT || 3001`.

Resources (one router + one table each, registered in `app.js`): `customers`, `vehicles`, `policies`, `renewals`, `users`, `logs` (read-only audit feed), `stats` (read-only dashboard aggregation at `GET /api/stats/dashboard`), `commercial-insurance-types`, `compulsory-insurance-types`, `insurance-companies`. Entity chain: `customer` 1→N `vehicle` 1→N `policy` 1→N `renewal_record`. The reference tables (`*_insurance_type`, `insurance_company`) auto-seed default rows inside `initDB()` when empty.

Not every endpoint is plain CRUD — when extending, mirror the existing non-RESTful ones: `PATCH /api/policies/:id/status`, `GET /api/renewals/upcoming`, `POST /api/renewals/:id/renew`.

Route conventions (see `routes/policies.js`, `routes/users.js`):
- **List** endpoints take `?page&pageSize&keyword&status...` and return `{ data, total, page, pageSize }`. Builds a `WHERE` from conditions/params arrays.
- **Create** returns `201` + the new row; **errors** return `{ error: message }`.
- **Auth is not enforced.** There is a `POST /api/users/login` (SHA-256 hash, returns the user object) but no session/JWT/middleware — all `/api` routes are open. The client just stores a user in `localStorage` under `car_insurance_current_user` and defaults to `admin`. When you need "the current user" server-side, note that route handlers currently hardcode `operator: '管理员'` rather than reading the real caller — match the surrounding code unless asked to fix this.
- Passwords are unsalted SHA-256 of `'123456'` in demo data (see `seed.js`, `users.js`).

### Frontend — two coexisting stacks (React → Vue-Vben migration)

**`client/` (React 18 + Vite + Ant Design ProComponents) — current production frontend.**
- `client/src/app.jsx` is the shell: `ProLayout` with the menu (`menuRoutes`) and all `<Route>`s, plus theme switching (light/dark/compact, stored in `localStorage` key `car_insurance_theme_mode`) and a change-password modal.
- All HTTP goes through `client/src/services/api.js` — an axios instance with `baseURL: '/api'`. Add new endpoints here as exported functions. In dev, Vite proxies `/api` → `http://localhost:3001` (`vite.config.js`).
- Pages live in `client/src/pages/<Name>/index.jsx`. List pages use `ProTable`; forms use `ModalForm` + `ProForm*` (see `docs/development-guide.md`). Status tag colors: `green`=正常, `red`=异常, `blue`=进行中, `default`=已结束.
- `PolicyPage` is mounted on **two** routes with a `mode` prop — `/policies` (`mode="create"`) and `/policies/query` (`mode="query"`) — same component, different behavior; the sidebar renders a separate `查` button for the query route. Keep both modes working when editing it.

**`client-vue/` (Vue 3 + Vben Admin v5) — new frontend, ~85% migrated, in progress.**
- Business code under `client-vue/apps/web-antd/src/`: `views/<name>/` (pages), `api/<name>.ts` (services via `api/request.ts`), routes in `router/routes/modules/driveease.ts`.
- Dev proxies `/api` → `http://localhost:3001` (`apps/web-antd/vite.config.ts`); Vben's built-in mock is disabled (`VITE_NITRO_MOCK=false`).
- Login reuses `POST /api/users/login` (see `api/core/auth.ts`) — so that endpoint is **not** dead code; do not remove it.
- **Policy page (create/query) is NOT yet migrated** (ComingSoon placeholder, no `api/policy.ts`) — the main gap. `.env.production` still points at Vben's public mock (fix to `/api` before building). `server/src/app.js` production static hosting still points at `client/dist` — do **not** delete `client/` until client-vue is cut over.

## Adding a feature (canonical flow)

**New API resource:**
1. Create `server/src/routes/<thing>.js` following the `policies.js` pattern (list with `{data,total,page,pageSize}`, CRUD, `log()` on writes).
2. Register it in `server/src/app.js`: `app.use('/api/<thing>', thingRoutes)`.
3. If it needs persistence, add the table in `initDB()` (`database.js`); for new columns use `ensureColumn`.

**New frontend page (client/, React):**
1. Create `client/src/pages/<Name>/index.jsx`.
2. Add API functions in `client/src/services/api.js`.
3. Add the route + an entry to `menuRoutes` in `client/src/app.jsx`.

**New frontend page (client-vue/, Vue-Vben):**
1. Create components under `client-vue/apps/web-antd/src/views/<name>/`.
2. Add API functions in `client-vue/apps/web-antd/src/api/<name>.ts` (map `{data,total,page,pageSize}` → Vben/vxe-grid shape; see `api/customer.ts`).
3. Add the route in `client-vue/apps/web-antd/src/router/routes/modules/driveease.ts`.

## Docs

Detailed (Chinese) docs live in `docs/`: `development-guide.md` (conventions + curl examples), `deployment-startup.md`, `design-document.md`, `update-record.md`.
