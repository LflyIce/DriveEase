# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

DriveEase — a car-insurance policy management system (车辆保单管理系统). UI text, domain strings, and DB enum values are **Chinese**; code identifiers are English. All user-facing strings should be Chinese.

## Commands

Single frontend: `client-vue/` (Vue-Vben Admin v5, pnpm monorepo, needs **Node 22.18+/24 + pnpm 11+** via corepack) + `server/` (**NestJS 11 + TypeScript + sql.js**, npm workspace). Run server scripts with `-w server`:

```bash
# 后端（server/，NestJS + TS，npm workspace）
npm install                  # install workspaces (if a postinstall fails on Windows, retry with --ignore-scripts)
npm run seed   -w server     # (re)initialize DB + demo data (ts-node) — run before first dev; **destructive**
npm run dev    -w server     # backend dev (nest start --watch), port 3001, Swagger at /api/v1/docs
npm run build  -w server     # nest build → server/dist
npm run start  -w server     # production (node dist/main.js, serves client-vue/apps/web-antd/dist)

# 前端（client-vue/，pnpm monorepo — run from client-vue/）
pnpm install                 # install the pnpm monorepo
pnpm dev:antd                # dev server, port 5666, proxies /api → :3001
pnpm build:antd              # build → apps/web-antd/dist/  (VITE_GLOB_API_URL=/api/v1 in .env.production)
pnpm --filter @vben/web-antd typecheck   # 前端类型检查（vue-tsc --noEmit）

# 一次性维护（server/）
npm run cleanup:renewals -w server   # 清理「原保单已不存在」的悬空续保记录；⚠️ 必须先停后端（sql.js 整库在内存，运行中的服务会用内存副本覆盖文件改动）

# Docker 一体化部署（单容器 = API + 前端静态资源 + sqlite 文件，详见 docs/deployment.md §6）
# 前提：① 仓库根 .env 设 JWT_SECRET（compose 用 ${JWT_SECRET:?} 强制校验）
#      ② 先准备 data/database.sqlite 文件再 up —— 挂载点不存在时 Docker 会把它建成目录
docker compose up -d         # build + run；挂载 ./data/database.sqlite → /app/server/database.sqlite 持久化
```

There is **no test runner and no linter** configured for the server — do not invent `npm test` / `npm run lint`. Typecheck the server with `node node_modules/typescript/bin/tsc --noEmit -p server/tsconfig.json` (run from repo root).

To reset all data: delete `server/database.sqlite`, then `npm run seed -w server`. (The sqlite file is gitignored, so a fresh clone has no data until you seed.) **`npm run seed` is itself destructive** — `seed.ts` `DELETE`s every table (and clears `sqlite_sequence`) before re-inserting demo data, and refuses to run when `NODE_ENV=production`; never run it against a DB whose data you want to keep.

## Architecture

### Database is sql.js via TypeORM — read this carefully
The DB is `sql.js` (SQLite compiled to WASM), accessed through **TypeORM's `sqljs` driver** — see `core/database/database.module.ts`: `TypeOrmModule.forRoot({ type:'sqljs', location:'server/database.sqlite', autoSave:true, synchronize:false, entities:[12个 = 9 业务表 + RBAC 的 Role/Permission/RolePermission] })`. Two critical, non-obvious consequences:

1. **整库在内存，`autoSave` 每次写都整文件回写**（Repository 写与 `dataSource.query` 原生写都落盘，已验证）。
2. **`SELECT last_insert_rowid()` 在任何写之后返回 0** —— TypeORM 的 `autoSave` 会调 `export()`，把 rowid 重置。所以**拿新增行的 id 必须用 `Repository.save()`**（driver 在 autoSave 之前捕获 rowid），**不要**用原生 `INSERT` + 单独 `SELECT last_insert_rowid()`，那样拿到的是 0。

Data access（按查询性质选择）：
- **简单单表 CRUD** → TypeORM `Repository<Entity>`（`@InjectRepository` + 模块里 `TypeOrmModule.forFeature([...])`）：customers、users(+auth)、logs、3 个参照表。
- **复杂多表 JOIN / 聚合 / 多步 upsert** → `DataSource.query(sql, params)`（原生）：vehicles 的 list/findOne、policies 全部、renewals 全部。返回行是 snake_case，由 `TransformInterceptor` 自动转 camelCase。其中**需要回填新 id 的插入**走 `Repository.save`（policies/renewals 额外注入了 Policy/Customer/Vehicle/RenewalRecord 的 Repository 专用于插入）。
- **审计日志** → `LogService`（`shared/audit/log.service.ts`，`log(action, target?, detail?, operator='管理员', result='成功')`，fire-and-forget、内部吞异常）。每个 create/update/delete 都调。

### Schema & migrations
Schema 由 `core/database/schema.ts` 的 `initSchema(dataSource)`（+ `ensureColumn`）定义并建表，启动时由 `SchemaBootstrapService`（`OnApplicationBootstrap`）执行。无迁移工具。**不要开 `synchronize:true`** —— 它会重建表、丢掉中文 CHECK 约束和遗留列；`synchronize:false` 下 TypeORM 只是把实体映射到既有表。
- **新增列**优先用 `ensureColumn(table, column, type)`（缺则 `ALTER TABLE ADD COLUMN`），同时**给实体加对应的 `@Column({name:'snake'}) camelCase` 属性**（`modules/<feature>/entities/*.entity.ts`）。
- 时间戳列用 `@Column({ name:'created_at', insert:false }) createdAt: string`（`insert:false` 让 DB 默认值 `CURRENT_TIMESTAMP` 生效；保持 `'YYYY-MM-DD HH:MM:SS'` 字符串，不用 `@CreateDateColumn` 的 Date 解析）。
- Enum 列用 `CHECK(... IN (...))` + **中文枚举值**（policy.status `'生效'/'待生效'/'已过期'/'已退保'`、user.status 等）。加新枚举要改 CHECK 约束（SQLite 不能就地改）→ 删表 + re-seed 或加新列。**例外：`user.role` 的 CHECK 已移除**（`schema.ts` 的 `dropUserRoleCheckConstraint` 一次性迁移，旧库重启自动重建）——RBAC 后 role 只是显示列，角色名由「角色管理」动态新增，CHECK 会拒绝写入新角色名。
- 部分表有双/遗留字段（`policy` 同时有 `start_date/end_date` 和 `effective_date/expiry_date`，service 用 `effective_date || start_date` 对账）。
- `policy.compulsory_detail` / `policy.commercial_detail` 是 TEXT 存 **JSON 字符串**，作为字符串返回（**不要**在 service 里 `JSON.parse`：响应拦截器不动字符串值，但解析会把内部键暴露给 camelCase 转换）。
- 材料上传（行驶证/身份证/营业执照/承保材料/电子保单）以 COS URL 存在 `customer`/`vehicle`/`policy` 的扁平 TEXT 列（见 `schema.ts` 的 `ensureColumn` 块）。

### Backend (NestJS 11 + TypeScript)
Feature-based modules under `server/src/`: `core/` (`DatabaseModule` = TypeORM `sqljs` 连接 + `SchemaBootstrapService`，`GlobalExceptionFilter`，`TransformInterceptor`，`ConfigModule`), `shared/` (`PaginationDto`, `LogService`), and `modules/<feature>/` (controller + service + module + `dto/` + `entities/`). Entry `main.ts`: cors, global prefix **`api/v1`**, `ValidationPipe`（`transform` + `enableImplicitConversion`，**`whitelist:false`** —— 迁移期宽松，不剔除未声明字段）, Swagger at `/api/v1/docs`, the global filter + interceptor. schema 初始化由 `SchemaBootstrapService.onApplicationBootstrap` 自动完成（不再在 `main.ts` 手动 `init`）。`AppModule` 注册所有 feature 模块和（生产时）`ServeStaticModule` 托管 `client-vue/apps/web-antd/dist` + SPA fallback（exclude `/api/(.*)`）。端口 `process.env.PORT || 3001`。环境变量：COS/OCR 凭证来自 `server/.env`（`@nestjs/config`）；`JWT_SECRET` 未设置时回退开发默认值 `driveease-dev-secret-change-me`（`users.module.ts`/`jwt.strategy.ts`），**生产必须显式设置**（docker-compose 已用 `${JWT_SECRET:?}` 强制，读仓库根 `.env`）。

Modules (one per resource): `customers`, `vehicles`, `policies`, `renewals`, `users` (+`AuthService` for JWT login + `AuthController` for `GET /auth/me` and `GET/PUT /auth/me/dashboard-config` — per-user dashboard layout JSON in `user.dashboard_config`), `logs` (read-only audit feed), `stats` (read-only `GET /api/v1/stats/dashboard`), `commercial-insurance-types`, `compulsory-insurance-types`, `insurance-companies`, `upload`, `ocr`, `rbac` (role/permission/role-permission; `GET/POST/PUT/DELETE /roles`, `GET /permissions`, `PUT /roles/:id/permissions`, all gated by `@RequirePermissions('rbac:manage')`). Entity chain: `customer` 1→N `vehicle` 1→N `policy` 1→N `renewal_record`. Reference tables auto-seed default rows inside `initSchema()` when empty.

**API contract (spec-aligned):** every response is wrapped by `TransformInterceptor` into `{ code, message, data, timestamp }`; `data`'s object keys are recursively converted snake_case→camelCase (`deepCamelKeys` — string/number/bool/null *values* are untouched, so JSON-in-TEXT columns pass through unchanged). Global prefix is **`/api/v1`**. Errors flow through `GlobalExceptionFilter` → same envelope with `data:null` and the right `code` (400/401/403/404/500). Success is HTTP 200 incl. create (`@HttpCode(200)`).

- **List** endpoints take `?page&pageSize&keyword&status...` (query DTOs extend `PaginationDto`); services build a `WHERE` from conditions/params arrays and return `{ data, total, page, pageSize }`. The interceptor camelizes the rows on the way out. `GET /policies` keyword matches policy_number / customer.name / customer.phone / vehicle.plate_number (the count query uses the same JOINs as the data query).
- Non-RESTful endpoints to mirror when extending: `PATCH /api/v1/policies/:id/status`, `GET /api/v1/renewals/upcoming`, `POST /api/v1/renewals/:id/renew`, `POST /api/v1/policies/full` (聚合录入:upsert 客户+车辆 + 新建保单), `POST /api/v1/upload` (multer → COS putObject → URL), `GET /api/v1/ocr/vehicle-license|id-card`.
- **Auth IS enforced via JWT + RBAC** (the original "no auth / fake token" design was replaced). `POST /api/v1/users/login` validates SHA-256 and returns `{ ...user, accessToken }` (JWT, `JWT_SECRET`, **无过期时间**——signOptions 不设 expiresIn，token 无 exp 声明（用户要求登录永不过期）, payload `{ userId, username, roleId, role, roleCode }`). Two global `APP_GUARD`s in `app.module.ts`, in order: `JwtAuthGuard` (no/invalid token → 401; `@Public()` opts out — only login) then `PermissionGuard`. `PermissionGuard` reads `@RequirePermissions(...codes)` from `rbac/decorators` — all listed codes must be in the user's role permission set; `roleCode==='admin'` short-circuits (super role, full access). Routes with no `@RequirePermissions` only need a valid token. Same-endpoint-different-code is checked dynamically in the controller via `RbacService.checkPermission(req.user, code)` (e.g. `PATCH /policies/:id/status`: `已退保`→`policy:surrender`, else `policy:activate`). Legacy rows with `user.role_id=NULL` are auto-healed on login (`AuthService.resolveRole` maps by the old `role` name and writes `role_id`). **RBAC data (role/permission/role_permission + user.role_id) lands only after `npm run seed`**; on an un-seeded DB every user has `roleCode=null` → locked out of all writes + empty frontend menu. `LogService` still defaults `operator` to `'管理员'` (real-caller identity not wired through `req.user` yet).
- Passwords are unsalted SHA-256 of `'123456'` in demo data (see `seed.ts`, `AuthService.hashPassword`).
- sql.js has no real transactions and FK enforcement is off → `POST /policies/full` and `POST /renewals/:id/renew` multi-step writes are not atomic (same as the old Express version).

### Production & Docker（单进程同源部署）
生产为**单进程同源**：`node server/dist/main.js` 同时提供 `/api/v1/*` API 和前端静态资源（**`NODE_ENV=production` 才挂 `ServeStaticModule`** —— 忘设是「页面 404/空白」的最常见原因）。数据库文件由 `database.module.ts` 按 `__dirname` 定位，永远是 `server/database.sqlite`（与启动目录无关）；前端产物路径同样按 `__dirname` 定位 `<仓库根>/client-vue/apps/web-antd/dist`，目录结构不能随意挪动。根目录 `Dockerfile`（4 阶段：前端 pnpm 构建 → `nest build` → 生产依赖 `--omit=dev` → runner）+ `docker-compose.yml` 打成**单容器**，用宿主 `data/database.sqlite` 文件挂载持久化（挂载点必须是已存在的文件，否则 Docker 建成目录）。**sql.js 单实例、不能水平扩展**（多进程各持一份内存副本会互相覆盖写），要扩展先迁 PostgreSQL（`docs/migrate-to-postgresql.md`）。

### Frontend — Vue-Vben Admin v5 (`client-vue/`)

Single frontend (the old React `client/` has been removed). Business code under `client-vue/apps/web-antd/src/`:
- `views/<name>/` (pages), `api/<name>.ts` (services via `api/request.ts`), routes in `router/routes/modules/driveease.ts`.
- Dev proxies `/api` → `http://localhost:3001` (`apps/web-antd/vite.config.ts`); Vben's built-in mock is disabled (`VITE_NITRO_MOCK=false`). `VITE_GLOB_API_URL=/api/v1`. The backend wraps every response in `{code,message,data,timestamp}`, so `request.ts` sets **`responseReturn:'data'`** (NOT removed — the `RequestClient` default is `'raw'`, which would return the full axios response un-unwrapped) plus `defaultResponseInterceptor({successCode:200})`; together they validate `code===200` and **unwrap `data`**, handing callers the payload directly. **All field names are camelCase** — the backend camelizes DB snake_case columns on the way out.
- Login reuses `POST /api/users/login` (see `api/core/auth.ts`) — so that endpoint is **not** dead code; do not remove it. `loginApi` stores the real JWT in vben accessStore; `getUserInfoApi`/`getAccessCodesApi` both call `GET /auth/me` (real user + permission codes — no longer the old fake-token localStorage read). **Menu visibility** = `meta.menuCode` filtered against `accessStore.accessCodes` in `router/guard.ts` (`filterRoutesByAccessCodes`: no `menuCode` = always shown; built-in admin's full code set → all menus; on refresh, `guard.ts` re-fetches codes if empty). **Sensitive buttons** use `v-access:code="['customer:delete']"` (registered via `registerAccessDirective` in `bootstrap.ts`; `hasAccessByCodes` removes the element when the code is absent).
- **List pages** use `useVbenVxeGrid` (`#/adapter/vxe-table`) + `useVbenModal` for forms; each page = `index.vue` + `data.ts` (三组 schema:`useFormSchema`/`useGridFormSchema`/`useColumns`) + `modules/form.vue`. API layer maps the unwrapped `{data,total,page,pageSize}` → `{items,total}` and flattens nested `customer`/`vehicle` into camelCase keys (`customerName`, `plateNumber`, …) — see `api/customer.ts`. Column `field` / form `fieldName` / OCR `info.*` / submitted bodies are **all camelCase** (matching the backend DTOs).
- **保单录入页** (`views/policy/create.vue`):独立页面(非 Modal),5 个 `useVbenForm` 分组(客户/车辆/保费/手续费/备注)+ `formApi.merge().submitAllForm(true)` 合并提交 → `POST /policies/full`(baseURL 已含 `/api/v1`);材料上传用 antd 原生 `Upload` + `customRequest` 调 `requestClient.upload('/upload')`(**不走** Vben `'Upload'` schema,因其绑 `fileList` 数组、无 responseUrlField)。文件 URL 字段键用 camelCase(`drivingFront`/`ssnFront`/`policyFile`…,对齐后端 `CreatePolicyFullDto`)。DatePicker 返回 dayjs,submit 前转 `'YYYY-MM-DD'`。
- 多列布局用 `wrapperClass:'grid-cols-2'` + 单项 `formItemClass:'cols-span-full'`(本项目**无 colProps**)。状态多选用 `CheckboxGroup`,单选用 `RadioGroup`(button 样式 `componentProps.optionType:'button'`)。
- **仪表盘** (`views/dashboard/`)：gridstack 可编辑网格（拖拽换位/调大小/增删卡片，编辑态↔预览态）。架构：`widgets/registry.ts` 注册表（11 个卡片 = 4 KPI + 6 图表 + 1 续保表，各声明 `defaultLayout`/`minW`/`minH`/`props`）；图表卡片用 `useChartCarousel` 自动轮播高亮数据项并弹 tooltip（mouseover 暂停、mouseout 恢复）；`useDashboardData` 加载 stats+upcoming 一次并 provide（widget inject + watch 渲染，后挂载的卡片也能拿到数据）；`useDashboardLayout` 管布局状态 + gridstack 实例 + 编辑模式，gridstack `change` 事件同步回 layout 并防抖 800ms 自动 PUT `/auth/me/dashboard-config`（无配置时回退注册表默认布局）。增删卡片走「Vue 改 layout → nextTick → `grid.makeWidget`/`removeWidget(el,false)`」，重置走逐条 `grid.update`（gridstack 不监听 DOM 属性变化）。**新增卡片**：写 widget 组件 + registry 注册即可。echarts 尺寸自适应由 vben `useEcharts` 内置 ResizeObserver 处理。
- Status tag colors: `green`=生效/正常, `blue`=待生效/进行中, `default`=已过期/已结束, `red`=已退保/异常。

## Adding a feature (canonical flow)

**New API resource (NestJS):**
1. Create `server/src/modules/<thing>/` with `<thing>.controller.ts`, `<thing>.service.ts`, `<thing>.module.ts`, `dto/`, and `entities/<thing>.entity.ts`. Services inject `Repository<Entity>`（简单 CRUD，模块加 `TypeOrmModule.forFeature([Entity])`）或 `DataSource`（复杂 JOIN/聚合，`dataSource.query`）；插入需要回填 id 的走 `Repository.save`（见上 lastInsertRowid 坑）。`LogService` 记审计；controller 写操作加 `@HttpCode(200)` 让外壳 `code` 统一 200。照抄 `policies` 模块的 list/CRUD + 非 RESTful 写法。
2. Register the module in `server/src/app.module.ts` imports.
3. If it needs persistence, add the table in `core/database/schema.ts` `initSchema()`（+ 新列用 `ensureColumn`），同时**给实体加 `@Column` 属性**并把该实体加入 `database.module.ts` 的 `TypeOrmModule.forRoot({ entities:[...] })`。

**New frontend page (client-vue/, Vue-Vben):**
1. Create components under `client-vue/apps/web-antd/src/views/<name>/` (三件套:`index.vue` + `data.ts` + `modules/form.vue`)。
2. Add API functions in `client-vue/apps/web-antd/src/api/<name>.ts` (map `{data,total,page,pageSize}` → `{items,total}`; see `api/customer.ts`)。
3. Add the route in `client-vue/apps/web-antd/src/router/routes/modules/driveease.ts`。

## Docs

Detailed (Chinese) docs live in `docs/`: `development-guide.md` (conventions + curl examples), `deployment.md` (部署指南：源码构建 / 前端独立 Nginx / Docker 三种方式), `deployment-startup.md`, `design-document.md`, `update-record.md`, `rbac-guide.md` (RBAC 全解：数据模型 + 前后端生效链路), `migrate-to-postgresql.md` (sql.js → PostgreSQL 迁移). **Note:** some docs — and the root **`README.md`**（仍写着 Express 后端、双前端、`npm run dev -w client`，全部过时）— were written for the old two-frontend setup and may still reference the removed `client/` React frontend; treat those sections as stale until refreshed.
