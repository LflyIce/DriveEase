# 车辆保单管理系统 — 开发文档

> 版本：2.0.0
> 日期：2026-07-08
> 说明：项目处于 React(`client/`) → Vue-Vben(`client-vue/`) 迁移期，双前端并存。本文同时覆盖两套前端的开发方式。`client/` 是当前生产前端，`client-vue/` 是迁移中的新前端（保单页待补）。

---

## 1. 环境准备

### 1.1 系统要求

项目含两套前端，环境要求不同：

| 软件 | client/ + server/ | client-vue/ |
|------|-------------------|-------------|
| Node.js | 18+ | **22.18+ 或 24** |
| 包管理器 | npm 9+（根 workspaces） | **pnpm 11+**（独立 monorepo） |
| 浏览器 | Chrome 90+ / Edge 90+ | 同左 |

> client-vue 推荐用 corepack 启用 pnpm：`corepack enable && corepack prepare pnpm@latest --activate`。无需安装 MySQL 或任何数据库服务，后端使用内置 SQLite（sql.js）。

### 1.2 安装与启动（client/ + server/，当前生产前端）

```bash
# 1. 进入项目根目录
cd D:\666\car

# 2. 安装前后端依赖（npm workspaces 一次性装 client + server）
npm install

# 3. 初始化演示数据
npm run seed -w server

# 4. 启动后端（端口 3001）
npm run dev -w server

# 5. 启动前端（端口 5173，另开终端）
npm run dev -w client
```

### 1.3 启动 client-vue/（新前端，迁移中）

```bash
cd D:\666\car\client-vue
corepack enable                       # 首次需启用 corepack
pnpm install                          # 安装 monorepo 依赖
pnpm dev:antd                         # 启动 apps/web-antd（端口 5666）
```

client-vue 的 dev 服务会把 `/api` 代理到 `http://localhost:3001`，**需先按 1.2 启动后端**。

### 1.4 访问地址

| 服务 | 地址 |
|------|------|
| client/ 前端 | http://localhost:5173 |
| client-vue/ 前端 | http://localhost:5666 |
| 后端 API | http://localhost:3001 |

---

## 2. 可用脚本

### 根目录（client/ + server/）

```bash
npm install             # 安装全部依赖
npm run dev -w server   # 启动后端开发服务
npm run dev -w client   # 启动 client/ 前端开发服务
npm run start -w server # 启动后端生产模式（同时托管 client/dist）
npm run build -w client # 构建 client/ 生产包
npm run seed -w server  # 填充演示数据（破坏性：清空重建）
```

### server/

```bash
npm run dev    # 开发模式（node --watch 热重载）
npm run start  # 生产模式
npm run seed   # 初始化演示数据
```

### client/

```bash
npm run dev      # Vite 开发服务
npm run build    # 构建到 dist/
npm run preview  # 预览生产构建
```

### client-vue/（pnpm monorepo）

```bash
pnpm install     # 安装依赖
pnpm dev:antd    # 启动 apps/web-antd 开发服务
pnpm build:antd  # 构建 apps/web-antd（产物 apps/web-antd/dist/）
```

> ⚠️ client-vue 构建前必须把 `apps/web-antd/.env.production` 的 `VITE_GLOB_API_URL` 从 Vben 公网 mock 改为 `/api`，否则产物打不到自己后端。

---

## 3. 测试数据

执行 `npm run seed -w server` 后写入（均为演示数据）：

### 用户账号（密码均为 123456）

| 用户名 | 角色 | 状态 |
|--------|------|------|
| admin | 管理员 | 启用 |
| zhangsan | 普通员工 | 启用 |
| lisi | 普通员工 | 启用 |
| wangwu | 管理员 | 启用 |
| zhaoliu | 普通员工 | 禁用 |

### 业务数据

| 数据 | 数量 | 说明 |
|------|------|------|
| 客户 | 5 | 张三、李四、王五、赵六、钱七 |
| 车辆 | 5 | 京A12345、沪B67890、粤C11111、渝D22222、浙E33333 |
| 保单 | 6 | 含生效、待生效、已过期等多种状态 |
| 续保记录 | 3 | 含已提醒、待提醒、已过期 |
| 操作日志 | 10 | 模拟日常操作记录 |
| 保险公司 | 3 | 平安、太平洋、人保财险 |
| 交强险种 | 2 | 交强险、代收车船税（initDB 自动种子） |
| 商业险种 | 8 | 第三者责任险等 8 项（initDB 自动种子） |

> 交强险种与商业险种的默认数据在 `initDB()`（表空时自动种入）和 `seed.js`（演示数据重建）中均有定义——seed 流程会先 DELETE 全表再插入，故两处都需要，非冗余 bug。

---

## 4. 开发规范

### 4.1 后端开发

#### 新增 API 路由

1. 在 `server/src/routes/` 创建路由文件（参照 `policies.js` 模式：列表返回 `{data,total,page,pageSize}`，CRUD，写操作调 `log()`）
2. 在 `server/src/app.js` 注册：`app.use('/api/<thing>', thingRoutes)`
3. 如需持久化，在 `database.js` 的 `initDB()` 加 `CREATE TABLE`；新增列用 `ensureColumn(table, column, type)`

#### 数据库操作

使用 `database.js` 工具函数（不要直接调 `db.run`，否则不会落盘）：

```javascript
import { all, get, run, log } from '../database.js';

const rows  = all('SELECT * FROM t WHERE col = ?', [value]);        // 查询多条
const row   = get('SELECT * FROM t WHERE id = ?', [id]);            // 查询单条（无结果返回 null）
const { lastInsertRowid } = run('INSERT INTO t (col) VALUES (?)', [value]); // 写入（自动落盘）
log({ operator: '操作人', action: '操作类型', target: '对象', detail: '详情' }); // 审计日志
```

> sql.js 是 WASM，**全库常驻内存，每次 `run()` 自动全文件落盘**；`all/get` 不写盘。

#### 操作日志

所有增删改操作都应调用 `log()`：`operator`（用户名）、`action`（如"新增客户"）、`target`（如保单号）、`detail`（可选）。第二个参数可传结果 `'成功'/'失败'`。

> 注意：当前路由的 `operator` 多硬编码为 `'管理员'`，未读取真实调用方（无认证中间件）。新增路由时先与周围代码保持一致，除非被要求修正。

### 4.2 前端开发

#### client/（React，当前生产）

新增页面：
1. 在 `client/src/pages/<Name>/index.jsx` 创建页面（列表用 ProTable，表单用 ModalForm + ProForm*）
2. 在 `client/src/services/api.js` 添加接口函数
3. 在 `client/src/app.jsx` 添加 `<Route>` 和 `menuRoutes` 菜单项

组件约定：状态色 green=正常 / red=异常 / blue=进行中 / default=已结束。

#### client-vue/（Vue-Vben，迁移中）

新增页面：
1. 在 `client-vue/apps/web-antd/src/views/<name>/` 创建页面组件
2. 在 `client-vue/apps/web-antd/src/api/<name>.ts` 添加接口函数（走 `request.ts` 封装）
3. 在 `client-vue/apps/web-antd/src/router/routes/modules/driveease.ts` 添加路由

> 接口响应形状适配：后端列表返回 `{data,total,page,pageSize}`，需在 api 层映射成 vxe-grid/Vben 期望的 `{items,total}` 等（参考 `api/customer.ts`）。

### 4.3 数据库变更

修改表结构后：
1. 修改 `database.js` 的 CREATE TABLE（新列优先用 `ensureColumn`）
2. 删除 `server/database.sqlite`
3. 重新 `npm run seed -w server`

> 注意：改枚举 CHECK 约束 SQLite 无法就地修改，需 drop 表重建或换新列。

---

## 5. API 接口测试

### 使用 curl

```bash
# 仪表盘统计
curl http://localhost:3001/api/stats/dashboard

# 客户列表（分页 + 搜索）
curl "http://localhost:3001/api/customers?page=1&pageSize=10&keyword=张"

# 新建客户
curl -X POST http://localhost:3001/api/customers \
  -H "Content-Type: application/json" \
  -d '{"name":"测试","phone":"13800000000"}'

# 保单列表（按状态筛选）
curl "http://localhost:3001/api/policies?status=生效"

# 用户登录（client-vue 的登录走此接口）
curl -X POST http://localhost:3001/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}'

# 30 天内到期续保
curl http://localhost:3001/api/renewals/upcoming

# 查看操作日志
curl "http://localhost:3001/api/logs?page=1&pageSize=20"
```

### 响应格式

列表：`{ "data": [...], "total": 100, "page": 1, "pageSize": 10 }`
错误：`{ "error": "描述" }`

---

## 6. 生产部署

### 6.1 构建前端

```bash
npm run build -w client     # 当前生产前端，产物 client/dist/
```

构建产物在 `client/dist/`，由 `npm run start -w server` 启动时由 Express 托管（含 SPA 回退）。

> client-vue 构建产物在 `client-vue/apps/web-antd/dist/`，**当前未接入 server 静态托管**。迁移完成后需改 `server/src/app.js` 的 `clientDist` 路径并验证，再切换。

### 6.2 进程管理（推荐 PM2）

```bash
npm install -g pm2
pm2 start "npm run start -w server" --name driveease-api   # 后端（含前端静态托管）
# 或单独托管前端：pm2 serve client/dist 80 --name driveease-web
```

### 6.3 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        root /path/to/car/client/dist;      # 迁移完成后改为 client-vue 产物
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 7. 常见问题

### Q: 启动报错 "node not found"
确保 Node.js 在 PATH 中。nvm 用户：`export PATH="/d/nvm/nodejs:$PATH"`（Git Bash）。

### Q: client-vue 启动报 Node/pnpm 版本不对
client-vue 要求 Node 22.18+/24 + pnpm 11+，与 client/server 的 Node 18+ 不同。用 corepack 启用 pnpm，必要时用 nvm 切换 Node 版本。

### Q: 前端页面空白
检查后端是否已启动（:3001），以及 Vite 代理是否指向 :3001（client/ 与 client-vue/ 均已默认配置）。

### Q: 数据库文件在哪
`server/database.sqlite`。删除后重新 `npm run seed -w server` 即可重置。

### Q: 如何重置所有数据
```bash
rm server/database.sqlite
npm run seed -w server
```

### Q: 端口被占用
```bash
export PORT=3002 && npm run dev -w server     # 改后端端口
# 前端端口改 client/vite.config.js 或 client-vue 的 vite 配置中的 server.port
```
