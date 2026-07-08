# 车辆保单管理系统 — 设计文档

> 版本：2.0.0
> 日期：2026-07-08
> 说明：本次更新据实重写。①数据库设计补全为真实的 **9 张表全字段**（原文档少 3 表 + 保单 12 个扩展列）；②路由清单修正为 **10 组**；③API 清单补全险种/公司管理接口；④移除原文档里**未实现的"切换 MySQL"章节**；⑤新增前端 React→Vue-Vben 迁移期说明。

---

## 1. 项目概述

DriveEase 是面向保险公司内部员工的车辆保单管理系统，管理客户、车辆、保单全生命周期与续保流程，并提供用户管理与操作审计。

### 1.1 目标用户

- **管理员**：全部权限，含用户管理、数据管理、系统配置
- **普通员工**：日常操作权限，含客户/车辆/保单的 CRUD

### 1.2 核心目标

- 保单全生命周期：创建 → 生效 → 续保 → 过期
- 客户与车辆信息统一管理
- 到期保单自动提醒
- 操作审计追踪

### 1.3 前端迁移状态（重要）

前端正处于由 **React(`client/`) → Vue-Vben(`client-vue/`)** 的迁移过程中，**双前端并存**：

| 前端 | 角色 | 状态 |
|------|------|------|
| `client/`（React 18 + AntD） | **当前唯一生产前端** | server 生产模式托管 `client/dist`，完整可用 |
| `client-vue/`（Vue 3 + Vben Admin v5） | 新前端，迁移中 | 约 85% 完成；**保单页未实现**（ComingSoon 占位）、生产 env 待修、从未构建 |

> 在 client-vue 补完保单页、修好生产配置、切换 server 静态托管之前，**不能删除 `client/`**。

---

## 2. 系统架构

### 2.1 技术选型

| 层级 | `client/`（生产） | `client-vue/`（迁移中） | `server/` |
|------|------|------|------|
| 框架 | React 18 | Vue 3 + Vben Admin v5 | Express 4 |
| UI | Ant Design 5 + ProComponents | Ant Design Vue + vxe-table + ECharts | — |
| 构建 | Vite 6 | Vite + Turbo（pnpm monorepo） | node --watch |
| 路由 | React Router 6 | Vue Router（Vben 路由模块） | Express Router |
| HTTP | Axios | Vben request（封装 axios） | — |
| 状态 | localStorage | Pinia + localStorage | — |
| 包管理 | npm（根 workspaces） | pnpm 11+（独立 monorepo） | npm |

**数据库**：SQLite via `sql.js`（WASM）——全内存加载，每次写操作全文件落盘。无需安装数据库服务。

### 2.2 架构图

```
┌─────────────────────────────────────────────────────┐
│                    浏览器 (Browser)                   │
│   client/ (React, 生产)   client-vue/ (Vue, 开发中)   │
└──────────────┬────────────────────┬─────────────────┘
               │ HTTP /api/*        │ HTTP /api/*
               │ Vite Proxy (dev)   │ Vite Proxy (dev)
┌──────────────▼────────────────────▼─────────────────┐
│             Express Server (Port 3001)               │
│  ┌───────────┐   ┌───────────┐   ┌───────────────┐  │
│  │  Routes   │ → │ DB Helper │ → │ SQLite File   │  │
│  │  (10 组)  │   │ all/get/  │   │ (sql.js WASM) │  │
│  │           │   │ run/log   │   │ 全内存+写落盘  │  │
│  └───────────┘   └───────────┘   └───────────────┘  │
│  生产模式额外托管 client/dist（SPA）                   │
└──────────────────────────────────────────────────────┘
```

### 2.3 项目结构

```
car/
├── client/                       # 前端（React，当前生产）
│   ├── src/
│   │   ├── pages/                # 10 个业务页
│   │   ├── services/api.js       # Axios 封装
│   │   ├── app.jsx               # ProLayout + 路由 + 主题
│   │   └── main.jsx
│   ├── vite.config.js            # /api 代理 → :3001
│   └── package.json
├── client-vue/                   # 前端（Vue-Vben，迁移中）
│   ├── apps/web-antd/src/        # Ant Design Vue 业务 app
│   │   ├── views/                # 业务页面
│   │   ├── api/                  # 接口服务层
│   │   └── router/routes/modules/driveease.ts
│   ├── pnpm-workspace.yaml       # 独立 pnpm monorepo
│   └── turbo.json
├── server/                       # 后端
│   ├── src/
│   │   ├── routes/               # 10 个路由文件
│   │   ├── database.js           # 建表 + all/get/run/log
│   │   ├── seed.js               # 演示数据
│   │   └── app.js                # Express 入口
│   └── package.json
├── docs/                         # 文档
├── images/                       # 参考图片
└── package.json                  # npm workspaces root（client + server）
```

---

## 3. 数据模型

共 **9 张表**，全部 `CREATE TABLE IF NOT EXISTS`，无迁移工具。除 `policy` 外均无动态加列。

### 3.1 ER 关系图

```
┌──────────┐ 1──N ┌──────────┐ 1──N ┌──────────┐ 1──N ┌───────────────┐
│ customer │──────│ vehicle  │──────│  policy  │──────│renewal_record │
│  客户    │      │  车辆    │      │  保单    │      │  续保记录     │
└──────────┘      └──────────┘      └──────────┘      └───────────────┘
     ▲                                   │
     └─────────────┬─────────────────────┘
                   │（policy 同时引用 customer/vehicle）

引用/配置表（彼此独立，policy 以字符串引用保险公司名而非外键）：
┌──────────────────────┐  ┌─────────────────────────┐  ┌──────────────────┐
│ insurance_company    │  │ compulsory_insurance_   │  │ commercial_       │
│  保险公司            │  │ type  交强险种          │  │ insurance_type    │
└──────────────────────┘  └─────────────────────────┘  │ 商业险种          │
                                                        └──────────────────┘
┌──────────┐       ┌───────────────┐
│   user   │       │ operation_log │   user 与 operation_log 独立于业务实体
│ 系统用户 │       │  操作日志     │   （operator 仅存用户名字符串，无外键）
└──────────┘       └───────────────┘
```

### 3.2 表结构详细设计

> 枚举列均用 `CHECK(... IN (...))` 约束，值为**中文**。时间列统一 `DEFAULT CURRENT_TIMESTAMP`。

#### 3.2.1 customer（客户表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK AUTOINCREMENT | 主键 |
| name | TEXT | NOT NULL | 姓名 |
| phone | TEXT | NOT NULL | 手机号 |
| email | TEXT | | 邮箱 |
| id_number | TEXT | | 身份证号 |
| address | TEXT | | 地址 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

#### 3.2.2 vehicle（车辆表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK AUTOINCREMENT | 主键 |
| plate_number | TEXT | NOT NULL UNIQUE | 车牌号 |
| brand | TEXT | NOT NULL | 品牌 |
| model | TEXT | NOT NULL | 型号 |
| year | INTEGER | | 年份 |
| vin | TEXT | | 车架号 |
| engine_number | TEXT | | 发动机号 |
| customer_id | INTEGER | NOT NULL, FK → customer(id) | 车主 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

#### 3.2.3 policy（保单表，核心）

**建表内字段**：

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK AUTOINCREMENT | 主键 |
| policy_number | TEXT | NOT NULL UNIQUE | 保单号 |
| customer_id | INTEGER | NOT NULL, FK → customer(id) | 投保人 |
| vehicle_id | INTEGER | NOT NULL, FK → vehicle(id) | 被保车辆 |
| insurance_type | TEXT | NOT NULL, CHECK IN ('交强险','商业险','综合') | 险种 |
| premium | REAL | NOT NULL | 保费（元） |
| sum_insured | REAL | NOT NULL | 保额（元） |
| start_date | TEXT | NOT NULL | 起保日期（原始字段，见 legacy 说明） |
| end_date | TEXT | NOT NULL | 终保日期（stats/renewals 读取此列） |
| status | TEXT | DEFAULT '待生效', CHECK IN ('生效','待生效','已过期','已退保') | 状态 |
| remark | TEXT | | 备注 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

**ensureColumn 动态扩展列**（共 12 个，均 TEXT 可空，建表后通过 `ALTER TABLE` 补加）：

| 字段 | 说明 |
|------|------|
| issue_time | 开单时间 |
| policy_date | 投保日期 |
| effective_date | 生效日期（与 start_date 冗余，见 legacy） |
| expiry_date | 到期日期（与 end_date 冗余，见 legacy） |
| certificate_type | 证件类型 |
| certificate_number | 证件号码 |
| insurance_company | 保险公司（**存名称字符串，非外键**） |
| contact_person | 联系人 |
| contact_phone | 联系电话 |
| sales_person | 销售人员 |
| compulsory_detail | **JSON 文本**：交强险明细数组（险种项、金额、图片等） |
| commercial_detail | **JSON 文本**：商业险明细数组 |

> `compulsory_detail` / `commercial_detail` 写入时 `JSON.stringify(...)`，前端读取后 `JSON.parse`。结构化数据塞进 TEXT 列时沿用此模式。

#### 3.2.4 renewal_record（续保记录表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK AUTOINCREMENT | 主键 |
| old_policy_id | INTEGER | NOT NULL, FK → policy(id) | 原保单 |
| new_policy_id | INTEGER | （语义为 FK → policy(id)，**未声明 FOREIGN KEY**） | 续保生成的新保单 |
| remind_date | TEXT | NOT NULL | 提醒日期 |
| status | TEXT | DEFAULT '待提醒', CHECK IN ('待提醒','已提醒','已续保','已过期') | 状态 |
| note | TEXT | | 备注 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

#### 3.2.5 user（系统用户表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK AUTOINCREMENT | 主键 |
| username | TEXT | NOT NULL UNIQUE | 用户名 |
| password | TEXT | NOT NULL | 密码（无盐 SHA-256） |
| email | TEXT | | 邮箱 |
| phone | TEXT | | 手机号 |
| role | TEXT | NOT NULL DEFAULT '普通员工', CHECK IN ('管理员','普通员工') | 角色 |
| status | TEXT | NOT NULL DEFAULT '启用', CHECK IN ('启用','禁用') | 状态 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

#### 3.2.6 operation_log（操作日志表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK AUTOINCREMENT | 主键 |
| operator | TEXT | NOT NULL | 操作人（用户名字符串，无外键） |
| action | TEXT | NOT NULL | 操作类型 |
| target | TEXT | | 操作对象 |
| detail | TEXT | | 操作详情 |
| result | TEXT | NOT NULL DEFAULT '成功' | 结果：成功/失败（**未加 CHECK**，见 legacy） |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 操作时间 |

#### 3.2.7 insurance_company（保险公司表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK AUTOINCREMENT | 主键 |
| name | TEXT | NOT NULL UNIQUE | 公司名称 |
| contact_person | TEXT | | 联系人 |
| contact_phone | TEXT | | 联系电话 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

#### 3.2.8 compulsory_insurance_type（交强险种表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK AUTOINCREMENT | 主键 |
| name | TEXT | NOT NULL UNIQUE | 险种名称 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

> **无 status 列**（与商业险种表不对称）。`initDB()` 表空时自动种入：交强险、代收车船税。

#### 3.2.9 commercial_insurance_type（商业险种表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK AUTOINCREMENT | 主键 |
| name | TEXT | NOT NULL UNIQUE | 险种名称 |
| status | TEXT | NOT NULL DEFAULT '启用', CHECK IN ('启用','禁用') | 状态 |
| sort_order | INTEGER | DEFAULT 0 | 排序 |
| remark | TEXT | | 备注 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

> `initDB()` 表空时自动种入 8 项：第三者责任险、车辆损失险、车上人员责任险（司机）、车上人员责任险（乘客）、医保外医疗费用责任险、划痕险、玻璃单独破碎险、车身盗抢险（sort_order 10–80）。

### 3.3 已知 legacy / 设计不一致点（本次保留不改，仅记录）

| 位置 | 问题 |
|------|------|
| `policy` | `start_date/end_date` 与 `effective_date/expiry_date` **冗余**：路由写入时强制四列同值；`stats.js`、`renewals.js` 仍读旧列 `end_date` |
| `policy` | `issue_time`/`policy_date`/`created_at` 三个时间字段语义近似、默认都为当下 |
| `policy.insurance_company` | 存公司**名称字符串**，未引用 `insurance_company(id)`，无外键 |
| `renewal_record` | 缺 `updated_at`（与其他表不对称）；`new_policy_id` 语义是外键但未声明 FK |
| `compulsory_insurance_type` | 缺 `status` 列（与 `commercial_insurance_type` 不对称） |
| `operation_log.result` | 实际枚举 '成功'/'失败' 但未加 CHECK 约束 |

---

## 4. API 接口设计

### 4.1 接口规范

- **基础路径**：`/api`
- **数据格式**：JSON
- **认证**：无 session/JWT/中间件，所有 `/api` 路由开放。`POST /api/users/login` 仅做 SHA-256 校验返回 user 对象
- **列表响应**：`{ data, total, page, pageSize }`
- **错误响应**：`{ error: "描述" }`
- **操作日志**：所有写操作（create/update/delete）调用 `log({...})` 写入 `operation_log`

### 4.2 接口清单（10 类）

#### 客户管理 `/api/customers`
GET /（page,pageSize,keyword）｜ GET /:id ｜ POST / ｜ PUT /:id ｜ DELETE /:id

#### 车辆管理 `/api/vehicles`
GET /（page,pageSize,keyword,customer_id）｜ GET /:id ｜ POST / ｜ PUT /:id ｜ DELETE /:id

#### 保单管理 `/api/policies`
GET /（page,pageSize,keyword,status）｜ GET /:id ｜ POST / ｜ PUT /:id ｜ **PATCH /:id/status** ｜ DELETE /:id

#### 续保管理 `/api/renewals`
GET /（page,pageSize,status）｜ **GET /upcoming**（30 天内到期）｜ POST / ｜ PATCH /:id ｜ **POST /:id/renew**（执行续保，生成新保单）

#### 用户管理 `/api/users`
GET /（page,pageSize,keyword,role,status）｜ GET /:id ｜ POST / ｜ PUT /:id ｜ DELETE /:id ｜ **POST /login**

#### 操作日志 `/api/logs`
GET /（page,pageSize,operator,action）— 只读

#### 统计 `/api/stats`
**GET /dashboard** — 仪表盘聚合（客户数、车辆数、保单数、到期预警等）

#### 商业险种管理 `/api/commercial-insurance-types`
GET / ｜ POST / ｜ PUT /:id ｜ DELETE /:id

#### 交强险种管理 `/api/compulsory-insurance-types`
GET / ｜ POST / ｜ PUT /:id ｜ DELETE /:id

#### 保险公司管理 `/api/insurance-companies`
GET / ｜ POST / ｜ PUT /:id ｜ DELETE /:id

---

## 5. 前端页面设计

### 5.1 client/（React，当前生产前端）

10 个业务页，均接入路由：仪表盘、客户、车辆、保单（`/policies` 新增 + `/policies/query` 查询双模式，同一组件 + `mode` prop）、保险公司、交强险、商业险、续保、用户、操作日志。

- **布局**：Ant Design ProLayout（顶部标题 + 侧边菜单 + 内容区）
- **列表页**：ProTable（搜索、分页、排序）
- **表单**：ModalForm + ProForm* 组件
- **状态色约定**：green=正常、red=异常、blue=进行中、default=已结束
- **主题**：light/dark/compact，存 localStorage（key `car_insurance_theme_mode`）
- **当前用户**：localStorage（key `car_insurance_current_user`），无登录态时默认 `admin`

### 5.2 client-vue/（Vue-Vben，迁移中）

业务代码在 `apps/web-antd/src/`，路由模块 `router/routes/modules/driveease.ts`。迁移进度：

| 模块 | 状态 |
|------|------|
| 登录、客户、车辆、保险公司、交强险、商业险、续保、用户、操作日志、仪表盘 | ✅ 已迁移（对接真实后端 `/api`，dev 代理到 :3001） |
| **保单（create/query 双模式）** | ❌ **未迁移**（ComingSoon 占位，无 `api/policy.ts`） |

- **请求层**：`api/request.ts`（`responseReturn:'body'` 适配后端裸对象/列表外壳）
- **dev 代理**：`apps/web-antd/vite.config.ts` 把 `/api` → `http://localhost:3001`
- **Mock**：已禁用 Vben 自带 mock（`VITE_NITRO_MOCK=false`）
- ⚠️ **生产 env 待修**：`.env.production` 的 `VITE_GLOB_API_URL` 仍指 Vben 公网 mock，构建前必须改为 `/api`

> client-vue 独立为 pnpm monorepo，**未纳入根 npm workspaces**；要求 Node 22.18+/24 + pnpm 11+。

---

## 6. 安全设计

### 6.1 密码存储

- 无盐 SHA-256 哈希，不可逆
- 演示数据密码统一为 `123456`

### 6.2 操作审计

- 所有关键操作（增、删、改）经 `log()` 写入 `operation_log`
- 记录字段：操作人、类型、对象、详情、结果、时间
- 日志只读，不可编辑/删除

### 6.3 生产化建议（尚未实现）

- 添加 JWT 认证中间件（当前所有 `/api` 开放）
- 密码哈希升级为 bcrypt
- 添加 HTTPS、CORS 白名单
- 路由层读取真实调用方（当前 `operator` 多硬编码 `'管理员'`）

> 说明：旧版文档此处曾列"替换 SQLite 为 MySQL"，但后端从未实现该能力（无 `DB_DIALECT`、无 `mysql2` 依赖），已移除该条，避免误导。
