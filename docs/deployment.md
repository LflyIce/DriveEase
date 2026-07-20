# DriveEase 部署指南

> 适用架构：后端 `server/`（NestJS 11 + TypeORM，sql.js 数据库）+ 前端 `client-vue/`（Vue-Vben Admin v5，pnpm monorepo）。
> 生产为**单进程同源部署**：`node server/dist/main.js` 同时提供 API（`/api/v1/*`）和前端静态资源（SPA）。
>
> 三种部署方式：
>
> | 方式 | 适用场景 | 章节 |
> | --- | --- | --- |
> | **源码构建部署**（推荐入门） | 一台服务器/虚机，直接跑 Node | [第 4 节](#4-方式一源码构建部署) |
> | **前端独立部署** | 前端放 Nginx/CDN，前后端分机 | [第 5 节](#5-方式二前端独立部署nginx可选) |
> | **Docker 部署**（推荐交付） | 一条命令拉起，环境一致 | [第 6 节](#6-方式三docker-部署) |

---

## 1. 部署架构

```
浏览器
  │  http://服务器:3001
  ▼
node server/dist/main.js  （单进程，端口 PORT=3001）
  ├─ /api/v1/*          → NestJS 各模块（customers/vehicles/policies/renewals/users/rbac/…）
  │                         ├─ 材料上传/OCR → 腾讯云 COS（需 COS_* 配置）
  │                         └─ 数据读写 → server/database.sqlite（sql.js，整库内存 + 每次写整文件回写）
  └─ /*（非 API 路径）   → ServeStaticModule 托管 client-vue/apps/web-antd/dist，SPA fallback 到 index.html
```

要点（都来自代码实现，部署前先理解）：

- **静态托管仅在 `NODE_ENV=production` 时生效**（[app.module.ts](../server/src/app.module.ts) 里 `if (process.env.NODE_ENV === 'production')`）。忘了设 `NODE_ENV` 是「页面 404/空白」的最常见原因。
- **数据库文件位置固定**：`database.module.ts` 按 `__dirname` 定位 → 永远是 `server/database.sqlite`（Docker 内即 `/app/server/database.sqlite`），与启动目录无关。
- **前端产物路径固定**：`app.module.ts` 按 `__dirname` 定位 `<仓库根>/client-vue/apps/web-antd/dist`，目录结构不能随意挪动。
- **sql.js 不支持多实例水平扩展**（每个进程各持一份内存副本会互相覆盖）。要扩先迁移 PostgreSQL，见 [migrate-to-postgresql.md](./migrate-to-postgresql.md)。

---

## 2. 环境要求

| 工具 | 版本 | 用途 |
| --- | --- | --- |
| Node.js | **22.18+ 或 24.x** | 前端构建（`client-vue` engines 强制要求）+ 后端构建与运行 |
| pnpm | **11+** | 前端 monorepo（`packageManager: pnpm@11.7.0`，推荐用 corepack 自动对齐） |
| npm | 随 Node | 后端（根目录 npm workspaces） |
| Git | 任意 | 拉取代码 |
| Docker | 24+（可选） | 方式三容器部署 |

pnpm 安装方式（任一台机器执行一次）：

```bash
# Linux / macOS / Windows PowerShell 通用
corepack enable          # Node 自带；之后 pnpm 命令会自动使用 packageManager 指定的 11.7.0
pnpm -v                  # 应输出 11.x
# 国内网络若 corepack 下载失败，先执行：
#   Linux/macOS:  export COREPACK_NPM_REGISTRY=https://registry.npmmirror.com
#   Windows PS:   $env:COREPACK_NPM_REGISTRY="https://registry.npmmirror.com"
```

---

## 3. 环境变量与配置（部署前必读）

### 3.1 三个「必须是真实环境变量」的配置 ⚠️

`NODE_ENV`、`PORT`、`JWT_SECRET` 在 **NestJS 模块加载时**（早于 `ConfigModule` 读取 `.env`）就被取值，所以**写在 `server/.env` 里对它们无效**，必须通过 shell 环境、PM2 `env`、systemd `Environment=` 或 Docker `-e` 注入：

| 变量 | 说明 | 缺省行为 |
| --- | --- | --- |
| `NODE_ENV` | `production` 才挂载前端静态资源 | 不设 → 只有 API，页面 404 |
| `PORT` | 监听端口 | 默认 `3001` |
| `JWT_SECRET` | 登录令牌签名密钥 | **缺省回退到公开的 dev 值 `driveease-dev-secret-change-me`，生产必须显式设置为随机长字符串** |

### 3.2 `server/.env`（COS 配置，唯一走 `.env` 文件的一组）

COS 四件套在**请求处理时**才读取（此时 `.env` 已加载），所以可以放文件里。复制示例文件后填真实值：

```bash
cp server/.env.example server/.env
```

```ini
# server/.env —— 腾讯云 COS（材料上传 + OCR 共用同一套 CAM 密钥）
COS_SECRET_ID=AKIDxxxxxxxxxxxxxxxx
COS_SECRET_KEY=xxxxxxxxxxxxxxxx
COS_BUCKET=driveease-1250000000
COS_REGION=ap-guangzhou
```

> - 未配置时系统其余功能正常，仅上传/OCR 接口返回 500「COS 未配置」。
> - **`.env` 能否被读到取决于进程工作目录（cwd）**：`ConfigModule` 默认读 `cwd` 下的 `.env`。`npm run start -w server` 的 cwd 是 `server/` ✅；从仓库根直接 `node server/dist/main.js` 的 cwd 是仓库根 ❌（读不到 `server/.env`）。PM2/systemd 同理，见第 4.5 节。

### 3.3 前端环境文件（⚠️ 它们不在 git 里，新拉代码必须手工创建）

根 `.gitignore` 的 `.env` / `.env.*` 规则把前端 env 文件也排除了，所以 **`client-vue/apps/web-antd/.env` 和 `.env.production` 只存在于本地，`git clone` 下来的新环境是没有的**。生产配置在构建时经 `vite-inject-app-config` 固化进 `index.html`，缺文件会导致 `apiURL` 为 `undefined`、所有接口请求失败。构建前按下述内容创建两个文件：

`client-vue/apps/web-antd/.env`（通用配置）：

```ini
# 应用标题
VITE_APP_TITLE=车辆保单管理系统
# 应用命名空间，用于缓存、store 等功能的前缀，确保隔离
VITE_APP_NAMESPACE=vben-web-antd
# 对 store 进行加密的密钥，在将 store 持久化到 localStorage 时会使用该密钥进行加密
VITE_APP_STORE_SECURE_KEY=please-replace-me-with-your-own-key
```

`client-vue/apps/web-antd/.env.production`（生产配置）：

```ini
VITE_BASE=/
VITE_GLOB_API_URL=/api/v1     # 同源部署保持不动；前端独立部署见第 5 节
VITE_COMPRESS=none            # 可改 gzip（配合 Nginx gzip_static）
VITE_PWA=false
VITE_ROUTER_HISTORY=hash
VITE_INJECT_APP_LOADING=true
VITE_ARCHIVER=true            # 构建后额外产出 dist.zip（用于独立部署分发，不需要可改 false）
```

> Docker 部署不用手工创建：`Dockerfile` 会在镜像构建时自动生成这两个文件（可用 `--build-arg VITE_GLOB_API_URL=...` 覆盖 API 地址）。

### 3.4 配置总览速查

| 配置 | 放哪 | 何时生效 |
| --- | --- | --- |
| `NODE_ENV` / `PORT` / `JWT_SECRET` | 真实环境变量（shell/PM2 env/systemd/docker -e） | 进程启动时 |
| `COS_*` | `server/.env`（cwd 必须是 `server/`）或真实环境变量 | 每次上传/OCR 请求时 |
| `VITE_*` | `.env.production` | **构建时**固化进 dist，改后必须重新 `pnpm build:antd` |

---

## 4. 方式一：源码构建部署

适用于一台 Linux 服务器（Windows 命令差异处会单独标注）。以下以部署目录 `/opt/driveease` 为例。

### 4.1 获取代码

```bash
git clone https://github.com/LflyIce/DriveEase.git /opt/driveease
cd /opt/driveease
```

### 4.2 构建前端

新环境先创建前端 env 文件（**git 里没有，必须手工建**，内容照抄第 3.3 节）：

```bash
cd /opt/driveease/client-vue/apps/web-antd
vi .env .env.production     # 按 3.3 节内容创建这两个文件
```

然后构建：

```bash
cd /opt/driveease/client-vue
corepack enable
pnpm install                # 或 pnpm install --frozen-lockfile
pnpm build:antd
```

- 产物：`client-vue/apps/web-antd/dist/`（+ `dist.zip`，`VITE_ARCHIVER=true` 时）。
- 构建吃内存（脚本内已设 `--max-old-space-size=8192`），**内存 < 4GB 的机器建议在本地构建好再上传 dist**。
- Windows 构建机：用 PowerShell 执行同样命令；`pnpm` 找不到时先 `corepack enable`。

### 4.3 构建后端

```bash
cd /opt/driveease
npm install                 # 安装根 workspace（含 server 全部依赖，seed 需要 devDependencies）
npm run build -w server     # nest build → server/dist/
```

### 4.4 初始化数据库（首次部署必做）

```bash
cd /opt/driveease
npm run seed -w server
```

这会生成 `server/database.sqlite` 并写入演示数据，默认账号 **`admin` / `123456`**（另有 zhangsan/lisi/wangwu/zhaoliu，同密码）。

> ⚠️ 三个注意：
> 1. **seed 是破坏性的**——先清空全部表再灌演示数据；已有真实数据的库**绝不要再跑**。
> 2. seed 在 `NODE_ENV=production` 下会拒绝执行，跑之前确保当前 shell 没设 `NODE_ENV=production`。
> 3. **RBAC 角色/权限数据只有 seed 才写入**。不 seed 的话库里没有任何用户，无法登录；旧库升级后若用户 `role_id` 为空，登录时会按旧角色名自动补齐。
>
> 已有备份数据则跳过 seed，直接把备份的 `database.sqlite` 放到 `server/` 下。schema（建表/加列）由 `SchemaBootstrapService` 在每次启动时自动补齐，无需手动建表。

### 4.5 启动生产服务（三种方式选一）

#### A. 直接运行（适合验证/小部署）

Linux：

```bash
cd /opt/driveease
NODE_ENV=production PORT=3001 JWT_SECRET='换成足够长的随机字符串' npm run start -w server
```

Windows PowerShell：

```powershell
cd D:\driveease
$env:NODE_ENV="production"; $env:PORT="3001"; $env:JWT_SECRET="换成足够长的随机字符串"
npm run start -w server
```

> 用 `npm run start -w server` 而不是直接 `node server/dist/main.js`：前者 cwd 是 `server/`，能读到 `server/.env` 里的 COS 配置（见 3.2）。

#### B. PM2 守护（推荐）

```bash
npm i -g pm2
```

在仓库根新建 `ecosystem.config.js`：

```js
const path = require('path');

module.exports = {
  apps: [
    {
      name: 'driveease',
      script: path.join(__dirname, 'server', 'dist', 'main.js'),
      // 关键：cwd 指向 server/，ConfigModule 才能读到 server/.env 里的 COS 配置
      cwd: path.join(__dirname, 'server'),
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        JWT_SECRET: '换成足够长的随机字符串', // 生产必须显式设置
      },
      instances: 1,          // sql.js 整库在内存，严禁多实例（cluster 模式会互相覆盖数据）
      exec_mode: 'fork',
      max_memory_restart: '512M',
      merge_logs: true,
      out_file: 'logs/out.log',
      error_file: 'logs/err.log',
    },
  ],
};
```

```bash
pm2 start ecosystem.config.js
pm2 save && pm2 startup     # 开机自启（按提示执行生成的命令）
pm2 logs driveease          # 看到 "Server running on port 3001" 即成功
```

#### C. systemd（Linux 原生守护）

`/etc/systemd/system/driveease.service`：

```ini
[Unit]
Description=DriveEase 车辆保单管理系统
After=network.target

[Service]
Type=simple
# WorkingDirectory 必须是 server/，否则读不到 server/.env（COS 配置）
WorkingDirectory=/opt/driveease/server
ExecStart=/usr/bin/node dist/main.js
Environment=NODE_ENV=production
Environment=PORT=3001
Environment=JWT_SECRET=换成足够长的随机字符串
# COS 四件套从 server/.env 注入（systemd 的 EnvironmentFile 语法与 .env 兼容）
EnvironmentFile=-/opt/driveease/server/.env
Restart=on-failure
RestartSec=5
User=www-data

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now driveease
systemctl status driveease
journalctl -u driveease -f
```

> 注意文件属主：`server/database.sqlite` 需要对 `User=` 指定的账号可写（如 `sudo chown -R www-data:www-data /opt/driveease/server/database.sqlite`）。

### 4.6 验证部署

```bash
# 1) API 存活（返回 Swagger 页面 HTML）
curl -I http://127.0.0.1:3001/api/v1/docs

# 2) 登录接口（应返回 code:200 和 accessToken）
curl -X POST http://127.0.0.1:3001/api/v1/users/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"123456"}'

# 3) 前端页面（返回 index.html）
curl -I http://127.0.0.1:3001/
```

浏览器访问 `http://服务器IP:3001`，用 `admin / 123456` 登录，能看到完整菜单即部署成功。**正式使用前请立即修改 admin 密码并替换 `JWT_SECRET`。**

---

## 5. 方式二：前端独立部署（Nginx，可选）

适用：前端要放独立 Web 服务器/CDN，或前后端分机器。后端部署与第 4 节相同（只是不再需要它托管静态资源）。

### 5.1 调整 API 地址并构建

先按第 3.3 节创建前端 env 文件（新环境没有这两个文件），再二选一：

- **Nginx 与后端同机**（推荐）：保持 `VITE_GLOB_API_URL=/api/v1`，由 Nginx 把 `/api` 反代到 Node。跨机器就改 Nginx `proxy_pass` 目标即可，前端无感。
- **前端直连后端域名/端口**：把 `.env.production` 的 `VITE_GLOB_API_URL` 改为完整地址，如 `https://api.example.com/api/v1`。后端默认 `app.enableCors()` 全放开，跨域可直接用（生产建议按需收敛）。

```bash
cd client-vue
pnpm build:antd        # 产物 apps/web-antd/dist（VITE_ARCHIVER=true 时同时产出 dist.zip）
```

### 5.2 上传产物并配置 Nginx

把 `dist/` 内容上传到前端服务器（如 `/var/www/driveease/`），配置：

```nginx
server {
    listen 80;
    server_name app.example.com;
    root /var/www/driveease;
    index index.html;

    # 若构建时 VITE_COMPRESS=gzip，且 nginx 编译了 gzip_static 模块，取消下一行注释
    # gzip_static on;

    # API 反代到后端（前后端同源，无需处理跨域）
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 25m;    # 电子保单/材料上传放宽限制
    }

    # SPA：前端路由（hash 模式下其实不依赖此行，兜底保留）
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

> 这种模式下后端 `NODE_ENV` 是否为 `production` 不再影响前端访问（不依赖 ServeStaticModule），但仍建议设为 `production` 保持一致。

---

## 6. 方式三：Docker 部署

仓库根已提供三个文件，无需自己编写：

| 文件 | 说明 |
| --- | --- |
| [`Dockerfile`](../Dockerfile) | 多阶段构建：① pnpm 构建前端 → ② nest 构建后端 → ③ 精简生产依赖 → ④ 运行时镜像（`node:24-bookworm-slim`） |
| [`.dockerignore`](../.dockerignore) | 排除 node_modules/dist/.env/sqlite，保证构建上下文干净、密钥不进镜像 |
| [`docker-compose.yml`](../docker-compose.yml) | 单服务编排：端口、环境变量注入、数据文件挂载、自动重启 |

镜像内结构（与裸机部署一致）：

```
/app
├─ client-vue/apps/web-antd/dist/   # 前端产物（ServeStaticModule 托管）
├─ server/
│  ├─ dist/                         # 后端产物（入口 dist/main.js）
│  └─ database.sqlite               # 数据文件 ← 挂载宿主文件持久化
└─ node_modules/                    # 仅生产依赖
```

### 6.1 前置条件

- 安装 Docker 24+（含 compose 插件：`docker compose version` 能输出版本号）。
- **构建机内存建议 ≥ 8GB**（前端构建峰值高；Docker Desktop 用户请在设置里调大内存上限）。

### 6.2 首次启动前的两个准备（必做）

**① 准备数据库文件 `data/database.sqlite`**

容器里数据库固定为 `/app/server/database.sqlite`，compose 按**文件**挂载。宿主文件不存在时 Docker 会把挂载点创建成**目录**，导致启动失败，所以先准备：

```bash
cd /opt/driveease   # 仓库根
mkdir -p data
```

- **全新部署（推荐）**：在任意装了 Node 的机器上生成含演示数据 + RBAC 角色权限的库，再拷过来：

  ```bash
  npm install                    # seed 需要 devDependencies（ts-node），不能用 --omit=dev
  npm run seed -w server         # 确保当前 shell 没有 NODE_ENV=production
  cp server/database.sqlite data/database.sqlite
  ```

  Windows PowerShell：`Copy-Item server\database.sqlite data\database.sqlite`

- **从备份恢复**：直接 `cp 备份文件 data/database.sqlite`。
- **空库起步**（不推荐）：`touch data/database.sqlite`（Windows：`New-Item data\database.sqlite`）。启动后会自动建表，但**没有任何用户和角色，无法登录**，仅适合随后手动灌数据的场景。

**② 在仓库根创建 `.env`**（compose 自动读取做 `${}` 替换）：

```ini
# /opt/driveease/.env —— 注意这是仓库根的 .env，给 compose 用，不是 server/.env
JWT_SECRET=换成足够长的随机字符串       # 必填，缺失时 compose 直接报错
COS_SECRET_ID=AKIDxxxxxxxxxxxxxxxx   # 选填（材料上传/OCR）
COS_SECRET_KEY=xxxxxxxxxxxxxxxx
COS_BUCKET=driveease-1250000000
COS_REGION=ap-guangzhou
```

### 6.3 启动（docker compose，推荐）

```bash
cd /opt/driveease
docker compose build          # 首次构建（约 5~15 分钟，取决于网络与内存）
docker compose up -d
docker compose logs -f        # 看到 "Server running on port 3001" 即成功
```

访问 `http://服务器IP:3001`，`admin / 123456` 登录。

### 6.4 纯 docker 命令（不用 compose）

```bash
docker build -t driveease:latest .

docker run -d --name driveease \
  -p 3001:3001 \
  -e JWT_SECRET='换成足够长的随机字符串' \
  -e COS_SECRET_ID=xxx -e COS_SECRET_KEY=xxx \
  -e COS_BUCKET=driveease-1250000000 -e COS_REGION=ap-guangzhou \
  -v "$PWD/data/database.sqlite:/app/server/database.sqlite" \
  --restart unless-stopped \
  driveease:latest

docker logs -f driveease
```

Windows PowerShell 挂载路径写：`-v "${PWD}\data\database.sqlite:/app/server/database.sqlite"`

### 6.5 升级与回滚

```bash
# 升级
cd /opt/driveease
cp data/database.sqlite "data/database.sqlite.bak-$(date +%Y%m%d)"   # 先备份
git pull
docker compose build
docker compose up -d          # 重建并替换容器；启动时 SchemaBootstrapService 自动补齐新增表/列

# 回滚
git checkout <上一个版本标签>
docker compose build
cp data/database.sqlite.bak-YYYYMMDD data/database.sqlite   # 如需回退数据
docker compose up -d
```

### 6.6 自定义前端 API 地址（前端独立部署场景）

镜像默认按同源（`/api/v1`）构建前端。若前端要与后端分域名部署，构建时用 build-arg 覆盖（`Dockerfile` 会在镜像内自动生成前端 env 文件，无需手工创建）：

```bash
docker build --build-arg VITE_GLOB_API_URL=https://api.example.com/api/v1 -t driveease:latest .
```

### 6.7 国内网络构建加速

`Dockerfile` 各阶段已预留注释行，取消注释即可：

- 阶段 1：`ENV COREPACK_NPM_REGISTRY=https://registry.npmmirror.com`（corepack 下载 pnpm）
- 阶段 1/2/3：`npm/pnpm config set registry https://registry.npmmirror.com`
- Docker  Hub 拉取基础镜像慢：给 Docker 配置镜像加速器（如各云厂商提供的 registry mirror）。

---

## 7. HTTPS / 前置反向代理（可选）

单进程本身即可对外服务；需要 HTTPS 或域名时在前面加一层 Nginx（三种部署方式通用）：

```nginx
server {
    listen 443 ssl http2;
    server_name app.example.com;
    ssl_certificate     /etc/ssl/app.example.com.crt;
    ssl_certificate_key /etc/ssl/app.example.com.key;

    client_max_body_size 25m;    # 电子保单上传

    location / {
        proxy_pass http://127.0.0.1:3001;   # Docker 部署时指向映射端口
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

前端用的是**相对路径** `/api/v1`，所以加 HTTPS 后无需改任何配置、无需重新构建。

---

## 8. 数据备份与恢复

全部业务数据都在一个文件里：`server/database.sqlite`（Docker 部署对应宿主的 `data/database.sqlite`）。

```bash
# 备份（建议低峰期或先停服：sql.js 每次写操作都是整文件回写，写入中途拷贝可能得到损坏副本）
docker compose stop driveease   # 或 pm2 stop driveease / systemctl stop driveease
cp data/database.sqlite "backups/database-$(date +%Y%m%d-%H%M).sqlite"
docker compose start driveease

# 恢复：停服 → 用备份覆盖 → 启动
```

建议用 crontab 每日定时备份并保留最近 N 份。迁移到 PostgreSQL 后改用 `pg_dump`，见 [migrate-to-postgresql.md](./migrate-to-postgresql.md)。

---

## 9. 部署验证清单

| # | 检查项 | 通过标准 |
| --- | --- | --- |
| 1 | `curl -I http://IP:3001/api/v1/docs` | 返回 200（Swagger 页面） |
| 2 | 登录接口 `POST /api/v1/users/login` | 返回 `code:200` + `accessToken` |
| 3 | 浏览器打开 `http://IP:3001` | 出现登录页，样式正常 |
| 4 | `admin / 123456` 登录 | 进入系统，左侧菜单完整（客户/车辆/保单/续保/统计/系统管理…） |
| 5 | 新增/编辑一条客户 | 保存成功，刷新后仍在（数据已落盘） |
| 6 | 保单录入上传一张材料 | 返回 COS URL（未配 COS 时此步跳过） |
| 7 | 在子页面按 F5 刷新 | 不 404（SPA fallback 正常） |
| 8 | 重启服务后再查数据 | 数据仍在（持久化正常） |

第 4 步若登录成功但**菜单为空/按钮全无** → RBAC 数据未落库，重新执行第 4.4 / 6.2 节的 seed 流程。

---

## 10. 常见问题

| 现象 | 原因与处理 |
| --- | --- |
| 页面 404 / 空白，但 `/api/v1/*` 正常 | `NODE_ENV` 不是 `production`（静态托管未挂载），或前端没构建。检查进程环境变量与 `client-vue/apps/web-antd/dist` 是否存在 |
| 接口全 401 | 未登录/token 过期；或 `JWT_SECRET` 与签发时不一致（换密钥后旧 token 全部失效，重新登录即可） |
| 生产环境 token 似乎"不保密" | `JWT_SECRET` 写在了 `server/.env` 里——**该文件对它无效**，密钥静默回退到公开的 dev 默认值。改用真实环境变量注入（见 3.1） |
| 登录成功但菜单空白、按钮全无 | RBAC 角色/权限未落库：数据库从未跑过 seed。按 4.4 节 seed（**会清空现有数据**，先备份） |
| 上传 500「COS 未配置」 | 缺 COS 四件套；且注意 `server/.env` 只有 cwd 为 `server/` 时才被读取（PM2/systemd 检查 `cwd`/`WorkingDirectory`） |
| `npm run seed` 报「禁止在生产环境运行」 | 当前 shell 设了 `NODE_ENV=production`，另开窗口或 `unset` 后再跑 |
| 端口被占用 | 改 `PORT`（如 `PORT=8080`），Docker 则改映射 `-p 8080:3001` |
| Docker 启动即崩、日志提到数据库 | 多半是没先创建 `data/database.sqlite`，挂载点被建成了目录：删掉该目录，按 6.2 节创建文件后重启 |
| `docker compose up` 报 `JWT_SECRET` 相关错误 | 仓库根 `.env` 未配置 `JWT_SECRET`（compose 的 `${JWT_SECRET:?}` 校验），按 6.2 节补齐 |
| `docker build` 在前端阶段被 kill | 内存不足：前端构建峰值高，Docker Desktop 调大内存，或本地构建好 dist 后改用方式一/二 |
| corepack 下载 pnpm 失败 | 网络问题：设 `COREPACK_NPM_REGISTRY=https://registry.npmmirror.com`（Docker 里取消 Dockerfile 对应注释行） |
| 想关生产的 Swagger | Swagger 默认常驻 `/api/v1/docs`；如需关闭，在 `main.ts` 用 `if (process.env.NODE_ENV !== 'production')` 包裹 `SwaggerModule.setup` 后重新构建 |
| 多实例/多机部署数据互相覆盖 | sql.js 架构限制，禁止多实例；迁移 PostgreSQL 后再扩（见迁移文档） |

---

## 附：相关文档

- [development-guide.md](./development-guide.md) — 本地开发环境与约定
- [rbac-guide.md](./rbac-guide.md) — 角色权限体系（RBAC 数据为何依赖 seed）
- [migrate-to-postgresql.md](./migrate-to-postgresql.md) — 数据量上来后迁移 PostgreSQL
- [deployment-startup.md](./deployment-startup.md) — ⚠️ 旧版（React + Express 时代），仅存档
