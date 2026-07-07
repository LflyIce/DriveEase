# 车辆保单管理系统 — 设计文档

> 版本：1.0.0
> 日期：2026-04-28
> 作者：系统架构设计

---

## 1. 项目概述

### 1.1 项目背景

面向保险公司内部员工的车辆保单管理系统，用于管理客户信息、车辆信息、保单全生命周期及续保流程，同时提供用户管理和操作审计功能。

### 1.2 目标用户

- **管理员**：拥有全部系统权限，包括用户管理、数据管理、系统配置
- **普通员工**：日常操作权限，包括客户、车辆、保单的 CRUD 操作

### 1.3 核心目标

- 保单全生命周期管理：创建 → 生效 → 续保 → 过期
- 客户与车辆信息的统一管理
- 到期保单的自动提醒
- 操作审计追踪，保障数据安全

---

## 2. 系统架构

### 2.1 技术选型

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | React 18 | 组件化 UI 开发 |
| UI 组件库 | Ant Design 5 + ProComponents | 企业级后台 UI 方案 |
| 构建工具 | Vite 6 | 快速 HMR 开发体验 |
| 前端路由 | React Router 6 | SPA 路由管理 |
| HTTP 客户端 | Axios | API 请求封装 |
| 后端框架 | Express 4 | 轻量级 Node.js 服务端 |
| 数据库 | SQLite (sql.js) | 零安装纯 JS 数据库（生产可切换 MySQL） |
| 项目管理 | npm workspaces | Monorepo 管理 |

### 2.2 架构图

```
┌─────────────────────────────────────────┐
│              浏览器 (Browser)             │
│  React + Ant Design Pro + React Router   │
└──────────────┬──────────────────────────┘
               │ HTTP /api/*
               │ Vite Proxy (dev)
┌──────────────▼──────────────────────────┐
│          Express Server (Port 3001)       │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  │
│  │ Routes  │→ │   DB    │→ │ SQLite  │  │
│  │ (7组)   │  │ Helper  │  │ File    │  │
│  └─────────┘  └─────────┘  └─────────┘  │
└─────────────────────────────────────────┘
```

### 2.3 项目结构

```
car/
├── client/                          # 前端项目
│   ├── src/
│   │   ├── pages/                   # 页面组件
│   │   │   ├── Dashboard/           # 仪表盘
│   │   │   ├── Customer/            # 客户管理
│   │   │   ├── Vehicle/             # 车辆管理
│   │   │   ├── Policy/              # 保单管理
│   │   │   ├── Renewal/             # 续保管理
│   │   │   ├── User/                # 用户管理
│   │   │   └── Log/                 # 操作日志
│   │   ├── services/                # API 服务层
│   │   │   └── api.js               # Axios 请求封装
│   │   ├── app.jsx                  # 应用入口 + ProLayout
│   │   └── main.jsx                 # React 挂载点
│   ├── index.html                   # HTML 模板
│   ├── vite.config.js               # Vite 配置（含代理）
│   └── package.json
├── server/                          # 后端项目
│   ├── src/
│   │   ├── routes/                  # API 路由
│   │   │   ├── customers.js         # 客户 CRUD
│   │   │   ├── vehicles.js          # 车辆 CRUD
│   │   │   ├── policies.js          # 保单 CRUD + 状态变更
│   │   │   ├── renewals.js          # 续保管理 + 一键续保
│   │   │   ├── stats.js             # 仪表盘统计
│   │   │   ├── users.js             # 用户管理 + 登录
│   │   │   └── logs.js              # 操作日志查询
│   │   ├── database.js              # 数据库初始化 + 工具函数
│   │   ├── seed.js                  # 测试数据填充
│   │   └── app.js                   # Express 入口
│   └── package.json
├── docs/                            # 文档
│   ├── plans/                       # 设计与计划文档
│   ├── design-document.md           # 设计文档（本文件）
│   └── development-guide.md         # 开发文档
└── package.json                     # npm workspace root
```

---

## 3. 数据模型

### 3.1 ER 关系图

```
┌──────────┐ 1──N ┌──────────┐ 1──N ┌──────────┐
│ Customer │──────│  Vehicle │──────│  Policy  │
│  客户     │      │  车辆    │      │  保单    │
└──────────┘      └──────────┘      └────┬─────┘
     │                                    │ 1
     │ 1──N                               │
     └────────────────────────────────────┘
                                     N──1 │
                                   ┌──────▼──────┐
                                   │RenewalRecord│
                                   │  续保记录    │
                                   └─────────────┘

┌──────────┐       ┌───────────────┐
│   User   │       │ OperationLog  │
│  系统用户 │──────→│  操作日志     │
└──────────┘       └───────────────┘
```

### 3.2 表结构详细设计

#### 3.2.1 customer（客户表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 主键 |
| name | TEXT | NOT NULL | 姓名 |
| phone | TEXT | NOT NULL | 手机号 |
| email | TEXT | | 邮箱 |
| id_number | TEXT | | 身份证号 |
| address | TEXT | | 地址 |
| created_at | DATETIME | DEFAULT NOW | 创建时间 |
| updated_at | DATETIME | DEFAULT NOW | 更新时间 |

#### 3.2.2 vehicle（车辆表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 主键 |
| plate_number | TEXT | NOT NULL, UNIQUE | 车牌号 |
| brand | TEXT | NOT NULL | 品牌 |
| model | TEXT | NOT NULL | 型号 |
| year | INTEGER | | 年份 |
| vin | TEXT | | 车架号 |
| engine_number | TEXT | | 发动机号 |
| customer_id | INTEGER | FK → customer.id | 车主 |
| created_at | DATETIME | DEFAULT NOW | 创建时间 |
| updated_at | DATETIME | DEFAULT NOW | 更新时间 |

#### 3.2.3 policy（保单表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 主键 |
| policy_number | TEXT | NOT NULL, UNIQUE | 保单号 |
| customer_id | INTEGER | FK → customer.id | 投保人 |
| vehicle_id | INTEGER | FK → vehicle.id | 被保车辆 |
| insurance_type | TEXT | CHECK | 险种：交强险/商业险/综合 |
| premium | REAL | NOT NULL | 保费（元） |
| sum_insured | REAL | NOT NULL | 保额（元） |
| start_date | TEXT | NOT NULL | 起保日期 |
| end_date | TEXT | NOT NULL | 终保日期 |
| status | TEXT | DEFAULT '待生效' | 状态：生效/待生效/已过期/已退保 |
| remark | TEXT | | 备注 |
| created_at | DATETIME | DEFAULT NOW | 创建时间 |
| updated_at | DATETIME | DEFAULT NOW | 更新时间 |

#### 3.2.4 renewal_record（续保记录表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 主键 |
| old_policy_id | INTEGER | FK → policy.id | 原保单 |
| new_policy_id | INTEGER | FK → policy.id, NULL | 续保后新保单 |
| remind_date | TEXT | NOT NULL | 提醒日期 |
| status | TEXT | DEFAULT '待提醒' | 状态：待提醒/已提醒/已续保/已过期 |
| note | TEXT | | 备注 |
| created_at | DATETIME | DEFAULT NOW | 创建时间 |

#### 3.2.5 user（系统用户表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 主键 |
| username | TEXT | NOT NULL, UNIQUE | 用户名 |
| password | TEXT | NOT NULL | 密码（SHA-256 哈希） |
| email | TEXT | | 邮箱 |
| phone | TEXT | | 手机号 |
| role | TEXT | DEFAULT '普通员工' | 角色：管理员/普通员工 |
| status | TEXT | DEFAULT '启用' | 状态：启用/禁用 |
| created_at | DATETIME | DEFAULT NOW | 创建时间 |
| updated_at | DATETIME | DEFAULT NOW | 更新时间 |

#### 3.2.6 operation_log（操作日志表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 主键 |
| operator | TEXT | NOT NULL | 操作人 |
| action | TEXT | NOT NULL | 操作类型 |
| target | TEXT | | 操作对象 |
| detail | TEXT | | 操作详情 |
| result | TEXT | DEFAULT '成功' | 操作结果：成功/失败 |
| created_at | DATETIME | DEFAULT NOW | 操作时间 |

---

## 4. API 接口设计

### 4.1 接口规范

- **基础路径**：`/api`
- **数据格式**：JSON
- **列表响应格式**：
  ```json
  {
    "data": [...],
    "total": 100,
    "page": 1,
    "pageSize": 10
  }
  ```
- **错误响应格式**：
  ```json
  { "error": "错误描述" }
  ```

### 4.2 接口清单

#### 客户管理 /api/customers

| 方法 | 路径 | 说明 | 参数 |
|------|------|------|------|
| GET | / | 客户列表 | page, pageSize, keyword |
| GET | /:id | 客户详情 | - |
| POST | / | 新建客户 | name*, phone*, email, id_number, address |
| PUT | /:id | 更新客户 | 同上 |
| DELETE | /:id | 删除客户 | - |

#### 车辆管理 /api/vehicles

| 方法 | 路径 | 说明 | 参数 |
|------|------|------|------|
| GET | / | 车辆列表 | page, pageSize, keyword, customer_id |
| GET | /:id | 车辆详情 | - |
| POST | / | 新建车辆 | plate_number*, brand*, model*, year, vin, engine_number, customer_id* |
| PUT | /:id | 更新车辆 | 同上 |
| DELETE | /:id | 删除车辆 | - |

#### 保单管理 /api/policies

| 方法 | 路径 | 说明 | 参数 |
|------|------|------|------|
| GET | / | 保单列表 | page, pageSize, keyword, status |
| GET | /:id | 保单详情 | - |
| POST | / | 新建保单 | policy_number*, customer_id*, vehicle_id*, insurance_type*, premium*, sum_insured*, start_date*, end_date*, remark |
| PUT | /:id | 更新保单 | 同上 |
| PATCH | /:id/status | 状态变更 | status* |
| DELETE | /:id | 删除保单 | - |

#### 续保管理 /api/renewals

| 方法 | 路径 | 说明 | 参数 |
|------|------|------|------|
| GET | / | 续保列表 | page, pageSize, status |
| GET | /upcoming | 30天内到期 | - |
| POST | / | 创建续保提醒 | old_policy_id*, remind_date*, note |
| PATCH | /:id | 更新状态 | status, note |
| POST | /:id/renew | 执行续保 | insurance_type, premium, sum_insured, start_date, end_date, remark |

#### 用户管理 /api/users

| 方法 | 路径 | 说明 | 参数 |
|------|------|------|------|
| GET | / | 用户列表 | page, pageSize, keyword, role, status |
| GET | /:id | 用户详情 | - |
| POST | / | 新建用户 | username*, password*, email, phone, role, status |
| PUT | /:id | 更新用户 | email, phone, role, status, password |
| DELETE | /:id | 删除用户 | - |
| POST | /login | 用户登录 | username*, password* |

#### 操作日志 /api/logs

| 方法 | 路径 | 说明 | 参数 |
|------|------|------|------|
| GET | / | 日志列表 | page, pageSize, operator, action |

#### 统计 /api/stats

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /dashboard | 仪表盘统计数据 |

---

## 5. 前端页面设计

### 5.1 页面清单

| 页面 | 路径 | 功能 |
|------|------|------|
| 仪表盘 | /dashboard | 数据总览：客户数、车辆数、保单数、到期预警 |
| 客户管理 | /customers | 客户列表（搜索+分页）、新建/编辑/删除 |
| 车辆管理 | /vehicles | 车辆列表（搜索+客户筛选）、新建/编辑/删除 |
| 保单管理 | /policies | 保单列表（搜索+状态筛选）、新建/编辑/激活/删除 |
| 续保管理 | /renewals | 续保列表（状态筛选）、标记提醒、一键续保 |
| 用户管理 | /users | 用户列表（角色+状态筛选）、新建/编辑/删除 |
| 操作日志 | /logs | 操作日志列表（操作人+操作类型筛选）、只读 |

### 5.2 布局结构

采用 Ant Design ProLayout 的 mix 布局：
- **顶部**：系统标题 + 导航菜单
- **侧边栏**：功能菜单（仪表盘、客户、车辆、保单、续保、用户、日志）
- **内容区**：各页面内容

### 5.3 通用交互模式

- **列表页**：ProTable 组件，支持搜索、分页、排序
- **新建/编辑**：ModalForm 弹窗表单
- **删除**：Popconfirm 确认弹窗
- **状态标签**：Tag 组件颜色区分（绿色=正常、红色=异常、蓝色=进行中、灰色=已结束）

---

## 6. 安全设计

### 6.1 密码存储

- 使用 SHA-256 哈希存储，不可逆
- 默认密码：`123456`（首次登录后建议修改）

### 6.2 操作审计

- 所有关键操作（增、删、改）自动记录到操作日志
- 记录字段：操作人、操作类型、操作对象、详情、结果、时间
- 日志不可编辑、不可删除

### 6.3 生产环境建议

- 替换 SQLite 为 MySQL
- 添加 JWT 认证中间件
- 添加 HTTPS
- 添加 CORS 白名单
- 密码哈希升级为 bcrypt

---

## 7. 数据库切换指南

系统默认使用 SQLite（sql.js），无需安装任何数据库服务。切换到 MySQL 只需：

```bash
# 设置环境变量
export DB_DIALECT=mysql
export DB_HOST=localhost
export DB_PORT=3306
export DB_NAME=car_insurance
export DB_USER=root
export DB_PASSWORD=your_password
```

然后修改 `server/src/database.js` 中的数据库连接配置。
