# DriveEase

DriveEase 是一个车辆保险保单管理系统，后端使用 Express 和 sql.js。前端正由 React（`client/`，当前生产前端）向 Vue-Vben Admin（`client-vue/`，迁移中）迁移，双前端并存。

## 快速启动

环境要求：

- Node.js 18 或更高版本
- npm 9 或更高版本

安装依赖：

```bash
npm install
```

初始化演示数据：

```bash
npm run seed -w server
```

启动后端：

```bash
npm run dev -w server
```

另开一个终端启动前端：

```bash
npm run dev -w client
```

访问地址：

- 前端页面（client/）：`http://localhost:5173`
- 后端 API：`http://localhost:3001`

### 新前端 client-vue（Vue-Vben，迁移中）

`client-vue/` 是正在迁移的新前端，独立 pnpm monorepo，要求 Node 22.18+/24 + pnpm 11+。需先启动后端，再：

```bash
cd client-vue
corepack enable && corepack prepare pnpm@latest --activate
pnpm install
pnpm dev:antd          # 端口 5666，/api 代理到 :3001
```

迁移约完成 85%（保单页待补）；迁移完成前生产部署仍使用 `client/`。详见 [开发文档](docs/development-guide.md)。

## 生产构建

构建前端：

```bash
npm run build -w client
```

启动后端生产服务。后端会同时托管 `client/dist` 静态文件：

```bash
npm run start -w server
```

然后访问 `http://localhost:3001`。

## 项目文档

- 启动和部署文档：[docs/deployment-startup.md](docs/deployment-startup.md)
- 开发文档：[docs/development-guide.md](docs/development-guide.md)
- 设计文档：[docs/design-document.md](docs/design-document.md)
- 更新记录：[docs/update-record.md](docs/update-record.md)
