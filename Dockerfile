# syntax=docker/dockerfile:1
# ============================================================
# DriveEase 一体化镜像：前端(client-vue, Vue-Vben) + 后端(server, NestJS + sql.js)
# 构建：docker build -t driveease:latest .
# 运行：docker compose up -d（推荐）或见 docs/deployment.md 第 6 节
# ============================================================

# ---------- 阶段 1：前端构建（pnpm monorepo → apps/web-antd/dist） ----------
FROM node:24-bookworm-slim AS web-builder
ENV CI=true
WORKDIR /app
RUN corepack enable
# 国内网络构建可取消下一行注释（加速 corepack 下载 pnpm）
# ENV COREPACK_NPM_REGISTRY=https://registry.npmmirror.com
COPY client-vue/ ./
# 前端 .env / .env.production 被根 .gitignore 忽略（构建环境不一定存在），镜像内显式生成保证配置确定；
# 前端独立部署时可用 --build-arg VITE_GLOB_API_URL=https://api.example.com/api/v1 覆盖
ARG VITE_GLOB_API_URL=/api/v1
RUN printf 'VITE_APP_TITLE=车辆保单管理系统\nVITE_APP_NAMESPACE=vben-web-antd\nVITE_APP_STORE_SECURE_KEY=please-replace-me-with-your-own-key\n' > apps/web-antd/.env \
 && printf 'VITE_BASE=/\nVITE_GLOB_API_URL=%s\nVITE_COMPRESS=none\nVITE_PWA=false\nVITE_ROUTER_HISTORY=hash\nVITE_INJECT_APP_LOADING=true\nVITE_ARCHIVER=false\n' "$VITE_GLOB_API_URL" > apps/web-antd/.env.production
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
# 构建内存需求大（脚本内已设 --max-old-space-size=8192），Docker Desktop 请给足内存
RUN pnpm build:antd

# ---------- 阶段 2：后端构建（nest build → server/dist） ----------
FROM node:24-bookworm-slim AS api-builder
WORKDIR /app
# 国内网络构建可取消下一行注释
# RUN npm config set registry https://registry.npmmirror.com
COPY package.json package-lock.json ./
COPY server/ ./server/
RUN npm ci
RUN npm run build -w server

# ---------- 阶段 3：后端生产依赖（--omit=dev，剔除 nest-cli/typescript 等） ----------
FROM node:24-bookworm-slim AS prod-deps
WORKDIR /app
# RUN npm config set registry https://registry.npmmirror.com
COPY package.json package-lock.json ./
COPY server/package.json ./server/
RUN npm ci --omit=dev

# ---------- 阶段 4：运行时 ----------
FROM node:24-bookworm-slim AS runner
ENV NODE_ENV=production \
    PORT=3001 \
    TZ=Asia/Shanghai
RUN apt-get update \
    && apt-get install -y --no-install-recommends tzdata \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# 生产依赖（整目录拷贝，兼容 npm 提升/嵌套两种 node_modules 布局）
COPY --from=prod-deps /app/ ./
# 后端产物
COPY --from=api-builder /app/server/dist ./server/dist
# 前端产物（路径固定：app.module.ts 以 __dirname 定位 <根>/client-vue/apps/web-antd/dist）
COPY --from=web-builder /app/apps/web-antd/dist ./client-vue/apps/web-antd/dist
EXPOSE 3001
# 数据库固定为 /app/server/database.sqlite（database.module.ts 按 __dirname 定位），
# 用 -v ./data/database.sqlite:/app/server/database.sqlite 挂载宿主文件持久化；
# JWT_SECRET / COS_* 通过 -e 或 compose environment 注入，不要 COPY 进镜像。
CMD ["node", "server/dist/main.js"]
