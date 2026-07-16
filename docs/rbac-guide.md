# 角色权限管理（RBAC）文档

> 本文档对应 DriveEase 的「角色权限管理」模块：完整 RBAC + 后端强制 + 前端联动。
> 相关代码：后端 `server/src/modules/rbac/`、`server/src/modules/users/`（认证）；前端 `client-vue/apps/web-antd/src/views/rbac/`、`router/guard.ts`、`router/routes/modules/driveease.ts`。

---

## 一、功能概述

- **管理员**可在「角色权限」模块里对每一类角色配置：**菜单可见性** + **敏感操作权限**。
- 权限**前后端双重生效**：前端按权限码隐藏菜单与按钮，后端按权限码拦截 API。
- 「角色权限」模块**永远只对管理员可见**（普通角色既看不到菜单，调 API 也会被 403）。
- **管理员是超级角色**：硬编码拥有全部权限、运行时短路放行、不可删除、权限不可调整。
- 角色可**新增 / 编辑 / 删除**（内置角色除外）；权限项**固定只读**（与代码标注一一对应，不开放增删）。

整套功能分三阶段实现：A（JWT 认证 + 数据底座）、B（权限生效 + 管理 API + UI）、C（按钮细粒度 + 收尾）。

---

## 二、数据模型（sql.js）

新增 3 张表 + `user` 表加 `role_id` 列（见 `server/src/core/database/schema.ts`）。

### 1. `role`（角色）
| 列 | 说明 |
|---|---|
| `id` | 主键 |
| `name` | 角色名（如「管理员」「普通员工」） |
| `code` | 角色编码，唯一（如 `admin`、`staff`） |
| `is_built_in` | 内置角色标记（1=内置不可删，管理员=1） |
| `description` | 描述 |
| `created_at` / `updated_at` | 时间戳 |

### 2. `permission`（权限项，只读）
| 列 | 说明 |
|---|---|
| `id` | 主键 |
| `code` | 权限码，唯一（如 `menu:customers`、`policy:delete`） |
| `name` | 显示名（如「客户管理」「保单删除」） |
| `type` | `menu` 或 `action`（CHECK 约束） |
| `module` | 所属模块（分组用，如 `customers`、`policy`） |
| `sort` | 排序 |

### 3. `role_permission`（角色—权限关联，联合主键）
| 列 | 说明 |
|---|---|
| `role_id` | 角色 id |
| `permission_id` | 权限 id |

### 4. `user` 表新增 `role_id`
- `role_id INTEGER REFERENCES role(id)`，可空。
- 旧的 `user.role`（中文字符串「管理员」/「普通员工」）**保留作显示兼容**，但权限一律走 `role_id`。
- 新增/编辑用户时，后端按 `role_id` 查 `role.name` 自动回填 `role` 列，保持两者同步。

### 超级角色规则
`role.code = 'admin'`（即内置管理员）恒定拥有**全部权限**：
- 后端 `PermissionGuard` 见 `req.user.roleCode === 'admin'` 直接短路放行，不查权限表。
- `/auth/me` 对管理员返回全部权限码，使其前端菜单/按钮全部显示。
- 该角色在管理 UI 里**不可删除、不可编辑权限**。

---

## 三、认证与权限链路

一次请求的完整流转：

```
客户端（带 Authorization: Bearer <JWT>）
   │
   ▼
JwtAuthGuard（全局 APP_GUARD #1）
   │  无/无效 token → 401
   │  标了 @Public() 的路由（仅 POST /users/login）→ 直接放行
   ▼
PermissionGuard（全局 APP_GUARD #2）
   │  读取 @RequirePermissions(...codes)
   │  无标注 → 放行（仅需登录）
   │  有标注 → req.user.roleCode==='admin' 短路放行；
   │           否则查该角色权限码集合，需包含全部所标 codes，否则 403
   ▼
Controller 方法
```

### 关键文件
| 职责 | 文件 |
|---|---|
| 登录签发 JWT | `modules/users/auth.service.ts` → `login()` |
| JWT 解析 → `req.user` | `modules/users/jwt.strategy.ts` |
| 认证守卫（401 / @Public） | `modules/users/guards/auth.guard.ts` |
| 公开装饰器 | `modules/users/decorators/public.decorator.ts` |
| 权限守卫（403 / 短路） | `modules/rbac/guards/permission.guard.ts` |
| 权限装饰器 | `modules/rbac/decorators/require-permissions.decorator.ts` |
| 权限查询 + 动态校验 | `modules/rbac/rbac.service.ts` |
| 双 Guard 注册 | `app.module.ts`（`providers` 里两个 `APP_GUARD`） |

### JWT 载荷
```jsonc
{
  "userId": 1,
  "username": "admin",
  "roleId": 1,
  "role": "管理员",      // 冗余旧列，显示兼容
  "roleCode": "admin",  // 权限判定依据，'admin' 即超级角色
  "iat": ..., "exp": ...  // 7 天有效
}
```
密钥来自 `process.env.JWT_SECRET`（缺省 `driveease-dev-secret-change-me`，生产务必覆盖）。

### 旧数据自愈
历史数据 `user.role_id` 为空时，`AuthService.resolveRole()` 在登录时按 `user.role`（中文名）查 `role` 表，命中则回填 `role_id` + 取 `roleCode`。**这是兜底机制，正式使用仍应以 `npm run seed` 落库为准。**

### 同一端点不同操作码（动态校验）
静态 `@RequirePermissions` 无法表达「同一接口随入参变权限」。保单状态变更是典型：`PATCH /policies/:id/status` 既用于激活也用于退保。处理方式：该端点**不标静态装饰器**，改为在 controller 内手动调 `RbacService.checkPermission(req.user, code)`：
- `dto.status === '已退保'` → 校验 `policy:surrender`
- 其余（激活等）→ 校验 `policy:activate`

---

## 四、权限码清单（共 29 项：11 菜单 + 18 操作）

定义在 `server/src/seed.ts`，与前端路由 `meta.menuCode` / 按钮 `v-access:code` / 后端 `@RequirePermissions` **一一对应**。

### 菜单权限（type=menu，11 项）
| 权限码 | 名称 | 对应路由 |
|---|---|---|
| `menu:dashboard` | 仪表盘 | `/dashboard` |
| `menu:customers` | 客户管理 | `/customers` |
| `menu:vehicles` | 车辆管理 | `/vehicles` |
| `menu:policies` | 保单管理 | `/policies` |
| `menu:insurance-companies` | 保险公司 | `/insurance-companies` |
| `menu:compulsory-insurances` | 交强险 | `/compulsory-insurances` |
| `menu:commercial-insurances` | 商业险 | `/commercial-insurances` |
| `menu:renewals` | 续保管理 | `/renewals` |
| `menu:users` | 用户管理 | `/users` |
| `menu:logs` | 操作日志 | `/logs` |
| `menu:rbac` | 角色权限 | `/rbac`（仅管理员） |

### 操作权限（type=action，18 项）
| 权限码 | 名称 | 后端端点 |
|---|---|---|
| `customer:create/update/delete` | 客户增/改/删 | `POST/PUT/DELETE /customers` |
| `vehicle:create/update/delete` | 车辆增/改/删 | `POST/PUT/DELETE /vehicles` |
| `policy:create` | 保单新增 | `POST /policies`、`POST /policies/full` |
| `policy:update` | 保单编辑 | `PUT /policies/:id` |
| `policy:delete` | 保单删除 | `DELETE /policies/:id` |
| `policy:activate` | 保单激活/状态变更 | `PATCH /policies/:id/status`（非退保） |
| `policy:surrender` | 保单退保 | `PATCH /policies/:id/status`（status=已退保） |
| `renewal:create` | 续保记录新增 | `POST /renewals` |
| `renewal:renew` | 续保办理/记录更新 | `POST /renewals/:id/renew`、`PATCH /renewals/:id` |
| `renewal:delete` | 续保删除 | `DELETE /renewals/:id`（预留） |
| `user:create/update/delete` | 用户增/改/删 | `POST/PUT/DELETE /users` |
| `rbac:manage` | 角色权限管理 | `rbac` 模块全部接口 |

> 读接口（`GET` 列表/详情、`/stats/*`、`/logs`、`/renewals/upcoming`）**不标权限码**，登录即可访问。

---

## 五、后端 API

所有响应仍走 `TransformInterceptor` 的 `{ code, message, data, timestamp }` 外壳，全局前缀 `/api/v1`。

### 认证
| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| POST | `/users/login` | `@Public` | 校验密码，返回 `{ ...user, accessToken }` |
| GET | `/auth/me` | 登录 | 当前用户 + `roleCode` + 权限码集（管理员返全集） |

### RBAC 管理（均需 `rbac:manage`，class 级 `@RequirePermissions`）
| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/permissions` | 权限项列表（只读，按 type/sort） |
| GET | `/roles` | 角色列表（含每角色权限码集，用于回显） |
| POST | `/roles` | 新建角色（`is_built_in` 强制 0） |
| PUT | `/roles/:id` | 编辑角色（仅 name/description，code/内置不可改） |
| DELETE | `/roles/:id` | 删除角色（内置禁删；先清 `role_permission`） |
| PUT | `/roles/:id/permissions` | 全量覆盖该角色权限码（body `{ codes: string[] }`） |

> 编辑角色用 **PUT**（前端 `RequestClient` 无 `patch` 方法，故后端 `@Put` + 前端 `requestClient.put`）。

---

## 六、前端机制（Vue-Vben Admin v5，accessMode='frontend'）

### 1. token 真实化
- `api/core/auth.ts` 的 `loginApi`：登录后把后端返回的 `accessToken` 存入 vben `accessStore`（替代旧的假 token）。
- `preferences.ts` 关闭 `enableRefreshToken`（后端未实现 refresh，401 直接登出）。
- `api/request.ts` 已在每个请求带 `Authorization: Bearer <token>`，无需改动。

### 2. 用户信息与权限码
- `getUserInfoApi` / `getAccessCodesApi` 都改为调用 `GET /auth/me`：
  - `getUserInfoApi`：把返回映射成 vben `UserInfo`（`roles:[role]`、`username` 等）。
  - `getAccessCodesApi`：返回 `permissions` 数组，存入 `accessStore.accessCodes`。
- 不再依赖 localStorage 里旧的 `driveease_user` 假数据。

### 3. 菜单可见性过滤（`router/guard.ts`）
- 每个业务路由 `meta.menuCode` 对应一个 `menu:*` 权限码（见 `router/routes/modules/driveease.ts`）。
- `guard.ts` 在 `generateAccess` 前用 `filterRoutesByAccessCodes(accessRoutes, accessCodes)` 递归过滤：
  - **无 `menuCode`** → 永远保留（首页、详情子页等）。
  - **有 `menuCode`** → 需 `accessCodes` 含该码才保留。
- 管理员 `accessCodes` 为全集 → 全部菜单可见。
- 刷新页面时 store 重置，`guard.ts` 检测 `accessCodes` 为空会重新调 `getAccessCodesApi` 补齐。

### 4. 按钮细粒度（`v-access:code`）
- 指令由 `bootstrap.ts` 的 `registerAccessDirective(app)` 全局注册（实现在 `packages/effects/access/src/directive.ts`）。
- 用法：`<Button v-access:code="['customer:delete']">删除</Button>`。
- 原理：`hasAccessByCodes(['customer:delete'])` 命中失败时，元素在 `mounted` 阶段被 `el.remove()` 移除。
- 各列表页敏感按钮已标注（customer/vehicle/user 增删改、policy 编辑/激活/退保/删除、renewal 续保）。

### 5. 权限管理 UI（`views/rbac/`）
| 文件 | 作用 |
|---|---|
| `index.vue` | 角色列表（vxe-grid），含「新建角色」+ 行内「配置权限/编辑/删除」 |
| `data.ts` | 角色表单 schema + 列定义 |
| `modules/role-form.vue` | 新建/编辑角色（Modal） |
| `modules/permission-drawer.vue` | 权限勾选抽屉：菜单权限 + 操作权限（按 module 分组），保存调 `PUT /roles/:id/permissions` |
| `api/rbac.ts` | roles/permissions CRUD 接口 |

- 内置角色（管理员）行：**编辑按钮禁用、删除不显示、权限抽屉 disabled**（顶部提示「拥有全部权限，运行时超级短路，不可调整」）。

---

## 七、默认角色与权限（`seed.ts`）

| 角色 | code | 内置 | 权限 |
|---|---|---|---|
| 管理员 | `admin` | 是 | **全部 29 项**（且运行时短路） |
| 普通员工 | `staff` | 否 | 排除：`menu:users`、`menu:logs`、`menu:rbac`、3 个参照表菜单 + 所有 `user:*` / `rbac:*` 操作；其余放开（可在 UI 收紧） |

用户映射（密码均为 `123456`）：
- `admin`、`wangwu` → 管理员
- `zhangsan`、`lisi` → 普通员工
- `zhaoliu` → 普通员工（**禁用**，登录会被拒）

---

## 八、使用流程

### 首次 / 数据重置：必须 re-seed
RBAC 数据（角色/权限/分配/`user.role_id`）**只有 `npm run seed` 之后才落库**。未 re-seed 时 `role` 表为空，所有用户登录后 `roleCode=null` → 被锁出一切写操作 + 前端菜单全空。

```bash
# 1. 停掉 dev server（Ctrl+C）—— sql.js 内存库不监听文件变化，不重启读不到新数据
# 2. re-seed（破坏性：清空全表后重插 demo 数据）
npm run seed -w server
# 3. 重启后端
npm run dev -w server
# 4. 浏览器重新登录（旧 JWT 全部失效）
```

> ⚠️ `seed.ts` 会 `DELETE` 所有表并重置自增，且拒绝在 `NODE_ENV=production` 下运行。生产环境**禁止** seed。

### 日常使用
1. 管理员登录 → 看到全部 11 个菜单（含「角色权限」）。
2. 进入「角色权限」→ 选某角色 → 「配置权限」→ 勾选菜单/操作 → 保存。
3. 该角色下的用户**重新登录后**新权限生效（权限码在登录时通过 `/auth/me` 下发）。

---

## 九、扩展指南

### 新增一个菜单页面
1. 后端 `seed.ts` 的 `perms` 数组加一项 `['menu:xxx', '名称', 'menu', 'xxx', N]`。
2. 前端 `router/routes/modules/driveease.ts` 加路由，`meta.menuCode: 'menu:xxx'`。
3. re-seed；在「角色权限」里给目标角色勾选该菜单。

### 新增一个敏感操作权限
1. 后端 `seed.ts` 加 `['xxx:create', '名称', 'action', 'xxx', N]`。
2. 对应 controller 方法加 `@RequirePermissions('xxx:create')`（或同端点多码用 `RbacService.checkPermission`）。
3. 前端按钮加 `v-access:code="['xxx:create']"`。
4. re-seed；在「角色权限」里分配。

### 新增一个角色
直接在「角色权限」UI 点「新建角色」→ 配置权限即可（无需改代码）。新建角色 `is_built_in=0`，可删可改。

---

## 十、注意事项与已知限制

1. **re-seed 才落库**：代码与 seed 是分离的——加表/加权限码后必须 re-seed 才进 DB。dev server 持有的 sql.js 内存库不会自动 reload 文件，re-seed 后要重启。
2. **内置角色保护**：管理员（`code='admin'`, `is_built_in=1`）不可删、权限不可改（UI disabled + 后端 `deleteRole` 校验）；其全权由运行时短路保证，不依赖权限表内容。
3. **权限项只读**：不开放权限码的增删（避免与代码标注脱节）；新增权限走 seed + 代码。
4. **sql.js 无事务、FK 未强制**：`PUT /roles/:id/permissions` 的「先删后插」、删除角色的「清关联 + 删角色」不是原子的（与项目其它多步写一致）。
5. **`last_insert_rowid()` 坑**：新建角色回填 id 用 `Repository.save()`，不用原生 `INSERT` + `last_insert_rowid()`（详见 CLAUDE.md）。
6. **审计 `operator` 仍默认「管理员」**：`LogService` 尚未从 `req.user` 取真实操作者；RBAC 的身份（`req.user`）已可用于后续接线。
7. **生产 JWT 密钥**：务必设置 `JWT_SECRET` 环境变量，勿用缺省值。
8. **菜单过滤 vs 路由可达**：前端过滤的是菜单可见性 + 注册的路由表；若用户手输无权限 URL，页面可能渲染但 API 会被后端 403 拦截（双保险）。后端是权限的最终事实来源。

---

## 附：阶段实现清单

| 阶段 | 内容 | 状态 |
|---|---|---|
| A1 | 数据底座：3 表 + `user.role_id` + entities + seed | ✅ |
| A2 | JWT 认证：`@Public` + `JwtStrategy` + `JwtAuthGuard`（全局）+ login 签发 + 前端真 token | ✅ |
| B1 | `@RequirePermissions` + `PermissionGuard`（管理员短路）+ JWT 加 `roleCode` + login 自愈 `roleId` | ✅ |
| B2 | RBAC 管理 API（roles/permissions CRUD + 分配）+ `/auth/me` + users `role_id` 适配 | ✅ |
| B3 | 5 个业务 controller 标注权限码 + 注册模块/Guard | ✅ |
| B4 | 前端 `/auth/me` 接入（`getAccessCodes` / `getUserInfo`） | ✅ |
| B5 | 路由 `menuCode` + `/rbac` + `guard.ts` 菜单过滤 | ✅ |
| B6 | 权限管理 UI（rbac 三件套）+ `api/rbac.ts` | ✅ |
| C1 | 列表页敏感按钮 `v-access:code` | ✅ |
| C2 | `policy:surrender` 拆分（动态 `checkPermission`） | ✅ |
| C3 | CLAUDE.md auth 前设更新 | ✅ |
