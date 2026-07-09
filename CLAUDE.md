# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

DriveEase — a car-insurance policy management system (车辆保单管理系统). UI text, domain strings, and DB enum values are **Chinese**; code identifiers are English. All user-facing strings should be Chinese.

## Commands

Single frontend: `client-vue/` (Vue-Vben Admin v5, pnpm monorepo, needs **Node 22.18+/24 + pnpm 11+** via corepack) + `server/` (Express + sql.js, npm workspace). Run server scripts with `-w server`:

```bash
# 后端（server/，npm workspace）
npm install                  # install server workspace
npm run seed   -w server     # (re)initialize DB + demo data  — run before first dev
npm run dev    -w server     # backend dev (node --watch), port 3001
npm run start  -w server     # production server (serves client-vue/apps/web-antd/dist)

# 前端（client-vue/，pnpm monorepo — run from client-vue/）
pnpm install                 # install the pnpm monorepo
pnpm dev:antd                # dev server, port 5666, proxies /api → :3001
pnpm build:antd              # build → apps/web-antd/dist/  (VITE_GLOB_API_URL=/api in .env.production)
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
- `policy.compulsory_detail` / `policy.commercial_detail` are TEXT columns holding **JSON-stringified** arrays (legacy from the old React form; the new 录入页 uses flat premium fields instead, but the columns remain). Apply the JSON-in-TEXT pattern whenever structured data must fit a TEXT column.
- Material uploads (行驶证/身份证/营业执照/承保材料/电子保单) store COS URLs in flat TEXT columns across `customer`/`vehicle`/`policy` (see `ensureColumn` block in `database.js`).

### Backend (Express, ESM)
`server/src/app.js` registers one router per resource under `/api/*` and, in production, serves `client-vue/apps/web-antd/dist` with an SPA fallback (`get('*')` → `index.html`). Port is `process.env.PORT || 3001`. COS credentials are read from `server/.env` via `dotenv` (see `.env.example`).

Resources (one router + one table each, registered in `app.js`): `customers`, `vehicles`, `policies`, `renewals`, `users`, `logs` (read-only audit feed), `stats` (read-only dashboard aggregation at `GET /api/stats/dashboard`), `commercial-insurance-types`, `compulsory-insurance-types`, `insurance-companies`, `upload`. Entity chain: `customer` 1→N `vehicle` 1→N `policy` 1→N `renewal_record`. The reference tables (`*_insurance_type`, `insurance_company`) auto-seed default rows inside `initDB()` when empty.

Not every endpoint is plain CRUD — when extending, mirror the existing non-RESTful ones: `PATCH /api/policies/:id/status`, `GET /api/renewals/upcoming`, `POST /api/renewals/:id/renew`, `POST /api/policies/full` (聚合录入:upsert 客户+车辆 + 新建保单), `POST /api/upload` (multer 接收 → COS putObject → 返回 URL).

Route conventions (see `routes/policies.js`, `routes/users.js`):
- **List** endpoints take `?page&pageSize&keyword&status...` and return `{ data, total, page, pageSize }`. Builds a `WHERE` from conditions/params arrays. `GET /api/policies` keyword 扩展到 customer.name/phone/vehicle.plate_number。
- **Create** returns `201` + the new row; **errors** return `{ error: message }`.
- **Auth is not enforced.** There is a `POST /api/users/login` (SHA-256 hash, returns the user object) but no session/JWT/middleware — all `/api` routes are open. The client just stores a user in `localStorage` under `car_insurance_current_user` and defaults to `admin`. When you need "the current user" server-side, note that route handlers currently hardcode `operator: '管理员'` rather than reading the real caller — match the surrounding code unless asked to fix this.
- Passwords are unsalted SHA-256 of `'123456'` in demo data (see `seed.js`, `users.js`).

### Frontend — Vue-Vben Admin v5 (`client-vue/`)

Single frontend (the old React `client/` has been removed). Business code under `client-vue/apps/web-antd/src/`:
- `views/<name>/` (pages), `api/<name>.ts` (services via `api/request.ts`), routes in `router/routes/modules/driveease.ts`.
- Dev proxies `/api` → `http://localhost:3001` (`apps/web-antd/vite.config.ts`); Vben's built-in mock is disabled (`VITE_NITRO_MOCK=false`). `request.ts` uses `responseReturn:'body'` (后端裸返回,无 `{code,data}` 外壳)。
- Login reuses `POST /api/users/login` (see `api/core/auth.ts`) — so that endpoint is **not** dead code; do not remove it.
- **List pages** use `useVbenVxeGrid` (`#/adapter/vxe-table`) + `useVbenModal` for forms; each page = `index.vue` + `data.ts` (三组 schema:`useFormSchema`/`useGridFormSchema`/`useColumns`) + `modules/form.vue`. API layer maps `{data,total,page,pageSize}` → `{items,total}` (see `api/customer.ts`)。
- **保单录入页** (`views/policy/create.vue`):独立页面(非 Modal),5 个 `useVbenForm` 分组(客户/车辆/保费/手续费/备注)+ `formApi.merge().submitAllForm(true)` 合并提交 → `POST /api/policies/full`;材料上传用 antd 原生 `Upload` + `customRequest` 调 `requestClient.upload('/upload')`(**不走** Vben `'Upload'` schema,因其绑 `fileList` 数组、无 responseUrlField)。DatePicker 返回 dayjs,submit 前转 `'YYYY-MM-DD'`。
- 多列布局用 `wrapperClass:'grid-cols-2'` + 单项 `formItemClass:'cols-span-full'`(本项目**无 colProps**)。状态多选用 `CheckboxGroup`,单选用 `RadioGroup`(button 样式 `componentProps.optionType:'button'`)。
- Status tag colors: `green`=生效/正常, `blue`=待生效/进行中, `default`=已过期/已结束, `red`=已退保/异常。

## Adding a feature (canonical flow)

**New API resource:**
1. Create `server/src/routes/<thing>.js` following the `policies.js` pattern (list with `{data,total,page,pageSize}`, CRUD, `log()` on writes).
2. Register it in `server/src/app.js`: `app.use('/api/<thing>', thingRoutes)`.
3. If it needs persistence, add the table in `initDB()` (`database.js`); for new columns use `ensureColumn`.

**New frontend page (client-vue/, Vue-Vben):**
1. Create components under `client-vue/apps/web-antd/src/views/<name>/` (三件套:`index.vue` + `data.ts` + `modules/form.vue`)。
2. Add API functions in `client-vue/apps/web-antd/src/api/<name>.ts` (map `{data,total,page,pageSize}` → `{items,total}`; see `api/customer.ts`)。
3. Add the route in `client-vue/apps/web-antd/src/router/routes/modules/driveease.ts`。

## Docs

Detailed (Chinese) docs live in `docs/`: `development-guide.md` (conventions + curl examples), `deployment-startup.md`, `design-document.md`, `update-record.md`. **Note:** some docs were written for the old two-frontend setup and may still reference the removed `client/` React frontend — treat those sections as stale until refreshed.
