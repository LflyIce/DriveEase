# DriveEase 项目部署和启动文档

> ⚠️ **本文档已过时**（描述的是 React `client/` + Express 时代）。当前架构为 **NestJS + TypeORM（默认 sql.js）+ 单前端 client-vue**。最新部署说明见 [deployment.md](./deployment.md)，数据库迁移到 PostgreSQL 见 [migrate-to-postgresql.md](./migrate-to-postgresql.md)。

## 1. 项目结构

```text
DriveEase/
├─ client/              # 前端（React，当前生产前端）
├─ client-vue/          # 前端（Vue-Vben，迁移中，独立 pnpm monorepo）
├─ server/              # 后端项目，Express + sql.js
├─ docs/                # 项目文档
├─ images/              # 参考图片和业务截图
├─ package.json         # npm workspace 配置
└─ package-lock.json    # 依赖锁文件
```

当前项目使用 npm workspaces 管理前后端：

- `client`：前端页面和静态构建产物（React，**当前生产前端**）。
- `client-vue`：新前端（Vue-Vben Admin v5，迁移中），是**独立的 pnpm monorepo**，不在根 workspaces 内，要求 Node 22.18+/24 + pnpm 11+。
- `server`：后端 API、数据库初始化和静态文件服务（生产模式托管 `client/dist`）。
- `server/database.sqlite`：运行后生成的本地数据库文件，已被 `.gitignore` 排除。

> 前端正处于 React → Vue-Vben 迁移期，双前端并存。迁移完成前生产部署仍以 `client/` 为准。

## 2. 环境要求

| 工具 | 建议版本 | 说明 |
| --- | --- | --- |
| Node.js | 18+ | 前后端运行环境 |
| npm | 9+ | 包管理工具 |
| 浏览器 | Chrome / Edge 最新版 | 访问前端页面 |

项目当前使用 `sql.js` 持久化到本地 SQLite 文件，不需要额外安装 MySQL、PostgreSQL 或 SQLite 服务端。

## 3. 本地开发启动

### 3.1 安装依赖

在项目根目录执行：

```bash
npm install
```

### 3.2 初始化演示数据

首次启动前建议执行：

```bash
npm run seed -w server
```

该命令会创建 `server/database.sqlite`，并写入测试用户、客户、车辆、保单、续保和日志数据。

测试账号：

| 用户名 | 密码 |
| --- | --- |
| admin | 123456 |
| zhangsan | 123456 |
| lisi | 123456 |
| wangwu | 123456 |

### 3.3 启动后端

```bash
npm run dev -w server
```

默认端口：`3001`

后端地址：`http://localhost:3001`

### 3.4 启动前端

新开一个终端，在项目根目录执行：

```bash
npm run dev -w client
```

默认端口：`5173`

前端地址：`http://localhost:5173`

开发环境下，Vite 会把 `/api` 请求代理到 `http://localhost:3001`。

## 4. 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm install` | 安装前后端依赖 |
| `npm run dev -w server` | 启动后端开发服务 |
| `npm run dev -w client` | 启动前端开发服务 |
| `npm run seed -w server` | 重置并写入演示数据 |
| `npm run build -w client` | 构建前端生产包 |
| `npm run preview -w client` | 本地预览前端生产包 |
| `npm run start -w server` | 启动后端生产服务 |

## 5. 生产环境部署

### 5.1 拉取代码

```bash
git clone https://github.com/LflyIce/DriveEase.git
cd DriveEase
```

### 5.2 安装依赖

生产环境推荐使用锁文件安装：

```bash
npm ci
```

如果当前 Node/npm 版本不支持 `npm ci`，可以使用：

```bash
npm install
```

### 5.3 构建前端

```bash
npm run build -w client
```

构建完成后，前端静态文件会生成到：

```text
client/dist/
```

> 当前生产前端为 `client/`，由 Express 在生产模式下托管 `client/dist`（含 SPA 回退）。
> 新前端 `client-vue/` 迁移完成后，改用 `pnpm build:antd` 构建（产物 `client-vue/apps/web-antd/dist/`），并需同步：①把 `apps/web-antd/.env.production` 的 `VITE_GLOB_API_URL` 改为 `/api`；②修改 `server/src/app.js` 的静态托管路径指向新产物；③验证后再切换、删除 `client/`。

### 5.4 初始化数据库

第一次部署时执行：

```bash
npm run seed -w server
```

注意：

- 该命令会清空并重建演示数据。
- 正式环境已有业务数据后，不要再次执行 `seed`。
- 需要备份数据时，请备份 `server/database.sqlite`。

### 5.5 启动生产服务

```bash
npm run start -w server
```

生产服务默认监听 `3001` 端口，并直接托管 `client/dist`。

访问地址：

```text
http://服务器IP:3001
```

如果需要修改端口：

Windows PowerShell:

```powershell
$env:PORT=8080
npm run start -w server
```

Linux/macOS:

```bash
PORT=8080 npm run start -w server
```

## 6. PM2 部署方式

安装 PM2：

```bash
npm install -g pm2
```

构建前端：

```bash
npm run build -w client
```

启动后端：

```bash
pm2 start "npm run start -w server" --name driveease
```

查看状态：

```bash
pm2 status
```

查看日志：

```bash
pm2 logs driveease
```

设置开机自启：

```bash
pm2 save
pm2 startup
```

## 7. Nginx 反向代理示例

如果希望使用域名访问，可以让 Nginx 代理到后端服务：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

这种方式下，前端静态文件仍由 Express 从 `client/dist` 提供。

## 8. 数据备份和恢复

数据库文件路径：

```text
server/database.sqlite
```

备份：

```bash
cp server/database.sqlite backups/database-$(date +%Y%m%d).sqlite
```

Windows PowerShell 示例：

```powershell
New-Item -ItemType Directory -Path backups -Force
Copy-Item server\database.sqlite backups\database-backup.sqlite
```

恢复：

```bash
cp backups/database-backup.sqlite server/database.sqlite
```

恢复后重启后端服务。

## 9. 常见问题

### 9.1 前端页面空白

先确认前端和后端都已启动：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:3001`

再检查浏览器控制台是否有 `/api` 请求失败。

### 9.2 API 请求失败

开发环境确认 `client/vite.config.js` 中代理目标为：

```text
http://localhost:3001
```

并确认后端命令 `npm run dev -w server` 正在运行。

### 9.3 数据为空

执行：

```bash
npm run seed -w server
```

如果仍然为空，删除 `server/database.sqlite` 后重新执行 `seed`。

### 9.4 端口被占用

修改后端端口：

```bash
PORT=3002 npm run dev -w server
```

Windows PowerShell：

```powershell
$env:PORT=3002
npm run dev -w server
```

修改前端端口需要调整 `client/vite.config.js` 中的 `server.port`。

### 9.5 生产环境刷新页面 404

后端已经配置了 SPA 回退：

```javascript
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});
```

请确认生产环境使用 `npm run start -w server` 启动，并且已经执行过 `npm run build -w client`。

