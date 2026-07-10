# DriveEase 部署指南

> 适用于当前架构：后端 `server/`（NestJS 11 + TypeScript + TypeORM，默认 sql.js）+ 前端 `client-vue/`（Vue-Vben Admin v5，pnpm monorepo）。生产为**单进程**：`node server/dist/main.js` 同时提供 API 和前端静态资源。
> 迁移到 PostgreSQL 的步骤见 [migrate-to-postgresql.md](./migrate-to-postgresql.md)。

---

## 1. 架构与产物

```
构建产物：
  client-vue/apps/web-antd/dist/   ← pnpm build:antd 产出（前端静态资源）
  server/dist/main.js              ← nest build 产出（后端入口）

运行时（NODE_ENV=production）：
  node server/dist/main.js
    ├─ /api/v1/*          → NestJS 各模块（customers/vehicles/policies/…）
    └─ /*（非 API）        → ServeStaticModule 托管 client-vue/.../dist，SPA fallback 到 index.html
```

- 端口：`process.env.PORT || 3001`。
- 前后端**同源**，前端 `VITE_GLOB_API_URL=/api/v1`，生产不需要跨域/代理。
- sql.js 模式下数据文件 `server/database.sqlite`（gitignored），随进程内存，每次写整文件回写。

---

## 2. 环境要求

| 工具 | 版本 | 用途 |
| --- | --- | --- |
| Node.js | **22.18+ / 24** | 前后端构建与运行 |
| pnpm | **11+**（corepack 启用） | client-vue monorepo |
| npm | 随 Node | server workspace |
| （可选）PostgreSQL | 15+ | 生产数据库（见迁移文档） |
| （可选）Docker | 24+ | 容器化部署 |

Windows 用 PowerShell；`node -v`、`pnpm -v`、`corepack -v` 应都能正常输出。

---

## 3. 环境变量

### 3.1 `server/.env`（后端，**不提交**，参考 `.env.example`）
```bash
# COS 对象存储（上传行驶证/身份证/保单等到腾讯云 COS）
COS_SECRET_ID=...
COS_SECRET_KEY=...
COS_BUCKET=car-xxxxxxxx
COS_REGION=ap-guangzhou

# 服务
PORT=3001
NODE_ENV=production        # 生产必须，触发 ServeStaticModule 托管前端

# 迁移到 Postgres 后追加（sql.js 模式下不需要）：
# DATABASE_URL=postgresql://user:pass@host:5432/driveease
```
> OCR 复用 COS 的同一套 SecretId/SecretKey（腾讯云 CAM 通用）。缺 COS 凭证时上传接口返回 500「COS 未配置」。

### 3.2 `client-vue/apps/web-antd/.env.production`（前端）
```bash
VITE_BASE=/
VITE_GLOB_API_URL=/api/v1          # 同源，由后端 ServeStaticModule 托管
VITE_COMPRESS=gzip                  # 可选 none/brotli/gzip
VITE_ROUTER_HISTORY=hash
VITE_ARCHIVER=true                  # 打包后生成 dist.zip
```
> 若前后端**分域名/分端口**部署，把 `VITE_GLOB_API_URL` 改成完整后端地址（如 `https://api.example.com/api/v1`），并在后端 `enableCors()` 允许该来源。

---

## 4. 生产构建

```bash
# 1) 前端（在 client-vue/ 下，需 pnpm）
cd client-vue
pnpm install
pnpm build:antd
# 产物：client-vue/apps/web-antd/dist/

# 2) 后端（在仓库根）
npm install                       # 安装 server workspace（postinstall 失败可加 --ignore-scripts）
npm run build -w server           # nest build → server/dist/
```

构建后目录关键路径：
```
client-vue/apps/web-antd/dist/index.html (+ assets/)
server/dist/main.js (+ 各模块 .js)
```

> 数据库初始化：sql.js 模式下首次运行前需 `npm run seed -w server`（**会清空全表**重灌 demo 数据；生产用真实数据时**不要**跑 seed）。schema 本身由 `SchemaBootstrapService` 启动时自动 `CREATE TABLE IF NOT EXISTS`，不需要手动建表。

---

## 5. 直接运行（裸机/PM2）

```bash
# 仓库根
NODE_ENV=production node server/dist/main.js
# 或带自定义端口
PORT=8080 NODE_ENV=production node server/dist/main.js
```

守护进程建议用 PM2：
```bash
npm i -g pm2
pm2 start server/dist/main.js --name driveease --env production -- --NODE_ENV=production
pm2 save && pm2 startup
```
> 注意：sql.js 的整库在内存 + 每次写整文件回写，**不要**多实例水平扩展（多个进程各持一份内存副本会互相覆盖写丢）。要横向扩展必须先迁移到 PostgreSQL。

---

## 6. Docker 部署（多阶段）

`Dockerfile`（放仓库根）：

```dockerfile
# ---------- 1. 前端构建 ----------
FROM node:22-bookworm-slim AS web-builder
WORKDIR /app
RUN corepack enable
COPY client-vue/ ./client-vue/
RUN cd client-vue && pnpm install --frozen-lockfile && pnpm build:antd

# ---------- 2. 后端构建 ----------
FROM node:22-bookworm-slim AS api-builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/ ./server/
RUN npm install --ignore-scripts
RUN cd server && npx nest build

# ---------- 3. 运行时 ----------
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
# 后端产物
COPY --from=api-builder /app/server/dist ./server/dist
COPY --from=api-builder /app/server/package.json ./server/package.json
COPY --from=api-builder /app/node_modules ./node_modules
# 前端产物（路径必须与 ServeStaticModule 期望的 client-vue/apps/web-antd/dist 一致）
COPY --from=web-builder /app/client-vue/apps/web-antd/dist ./client-vue/apps/web-antd/dist
# server/.env 通过环境注入或挂载，不要 COPY 进镜像
EXPOSE 3001
CMD ["node", "server/dist/main.js"]
```

构建与运行：
```bash
docker build -t driveease:latest .
# COS 凭证等用 -e 注入；数据卷挂载 database.sqlite（sql.js 模式）或连外部 Postgres
docker run -d -p 3001:3001 \
  -e COS_SECRET_ID=... -e COS_SECRET_KEY=... -e COS_BUCKET=... -e COS_REGION=... \
  -e NODE_ENV=production \
  -v $(pwd)/data:/app/server \      # 持久化 database.sqlite（sql.js 模式）
  --name driveease driveease:latest
```

> `docker-compose.yml`（生产建议外接 Postgres，见迁移文档）：
> ```yaml
> services:
>   app:
>     image: driveease:latest
>     ports: ["3001:3001"]
>     environment:
>       NODE_ENV: production
>       DATABASE_URL: postgresql://driveease:secret@db:5432/driveease
>       COS_SECRET_ID: ${COS_SECRET_ID}
>       COS_SECRET_KEY: ${COS_SECRET_KEY}
>       COS_BUCKET: ${COS_BUCKET}
>       COS_REGION: ${COS_REGION}
>     depends_on: [db]
>   db:
>     image: postgres:16
>     environment:
>       POSTGRES_USER: driveease
>       POSTGRES_PASSWORD: secret
>       POSTGRES_DB: driveease
>     volumes: [pgdata:/var/lib/postgresql/data]
> volumes:
>   pgdata:
> ```

---

## 7. Nginx 反向代理（可选，HTTPS / 多实例）

前后端同源时一般不需要 Nginx；若要加 HTTPS 或在 Postgres 后做负载均衡：

```nginx
server {
  listen 443 ssl http2;
  server_name app.example.com;
  ssl_certificate     /etc/ssl/app.crt;
  ssl_certificate_key /etc/ssl/app.key;

  # 前端 + API 都转发到 Node 进程（同源）
  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }

  # 上传大文件（电子保单）放宽限制
  client_max_body_size 25m;
}
```

---

## 8. 健康检查与日志

- 健康端点：当前未单独提供 `/health`；可用 `GET /api/v1/stats/dashboard` 是否返回 `{code:200}` 作为存活探测。
- Swagger：`GET /api/v1/docs`（生产可按需关闭：在 `main.ts` 里用 `NODE_ENV!=='production'` 包裹 Swagger setup）。
- 日志：Nest 默认输出到 stdout；生产用 PM2/Docker 收集 stdout 即可。sql.js 启动会打印 `Schema initialized` 与 `Server running on port 3001`。

---

## 9. 升级/回滚要点

- 升级前备份 `server/database.sqlite`（sql.js）或对 Postgres 做 `pg_dump`。
- schema 变更通过 `server/src/core/database/schema.ts` 的 `ensureColumn` 增量加列（启动自动执行）；**新增枚举值要改 CHECK 约束**（SQLite 不能就地改，需 drop+reseed 或新列；Postgres 见迁移文档）。
- 回滚：用上一版本的镜像/构建产物，配合备份的数据文件/库恢复。

---

## 10. 常见问题

| 现象 | 排查 |
| --- | --- |
| 启动报 `'node' 不是内部或外部命令` | Windows 上 npm/pnpm 经 cmd.exe 丢 node 路径；换干净 PowerShell，或安装时 `--ignore-scripts` |
| 前端页面空白 / 接口 404 | 确认 `NODE_ENV=production`（否则 ServeStaticModule 不挂载）且前端已 `build:antd` |
| 接口 404 但页面正常 | `VITE_GLOB_API_URL` 与后端前缀 `/api/v1` 不一致 |
| 上传 500「COS 未配置」 | `server/.env` 缺 COS 四件套 |
| 多实例数据互相覆盖 | sql.js 不支持横向扩展；上 Postgres 后再扩 |
| `npm run seed` 报错或清空了数据 | seed 是**破坏性**的，且 `NODE_ENV=production` 时会拒绝运行 |
