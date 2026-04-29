# 车辆保单管理系统 — 开发文档

> 版本：1.0.0
> 日期：2026-04-28

---

## 1. 环境准备

### 1.1 系统要求

| 软件 | 最低版本 | 说明 |
|------|---------|------|
| Node.js | 18+ | 运行时环境 |
| npm | 9+ | 包管理器 |
| 浏览器 | Chrome 90+ / Edge 90+ | 现代浏览器 |

**无需安装 MySQL 或任何数据库服务**，开发环境使用内置 SQLite。

### 1.2 安装步骤

```bash
# 1. 进入项目目录
cd D:\666\car

# 2. 安装依赖（前后端一次性安装）
npm install

# 3. 初始化测试数据
npm run seed -w server

# 4. 启动后端（端口 3001）
npm run dev -w server

# 5. 启动前端（端口 5173，新终端）
npm run dev -w client
```

### 1.3 访问地址

| 服务 | 地址 |
|------|------|
| 前端页面 | http://localhost:5173 |
| 后端 API | http://localhost:3001 |
| API 代理 | Vite 自动代理 /api → :3001 |

---

## 2. 可用脚本

### 根目录

```bash
npm install           # 安装全部依赖
npm run dev -w server # 启动后端开发服务
npm run dev -w client # 启动前端开发服务
npm run start -w server # 启动后端生产模式
npm run build -w client # 构建前端生产包
npm run seed -w server # 填充测试数据
```

### server/

```bash
npm run dev    # 启动开发模式（--watch 热重载）
npm run start  # 启动生产模式
npm run seed   # 初始化测试数据
```

### client/

```bash
npm run dev      # 启动 Vite 开发服务
npm run build    # 构建生产包到 dist/
npm run preview  # 预览生产构建
```

---

## 3. 测试数据

执行 `npm run seed -w server` 后，系统会创建以下测试数据：

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

---

## 4. 开发规范

### 4.1 后端开发

#### 新增 API 路由

1. 在 `server/src/routes/` 创建路由文件
2. 在 `server/src/app.js` 注册路由：
   ```javascript
   import newRoutes from './routes/new.js';
   app.use('/api/new', newRoutes);
   ```
3. 如需数据库表，在 `server/src/database.js` 的 `initDB()` 中添加 CREATE TABLE

#### 数据库操作

使用 `database.js` 提供的工具函数：

```javascript
import { all, get, run, log } from '../database.js';

// 查询多条
const rows = all('SELECT * FROM table WHERE col = ?', [value]);

// 查询单条
const row = get('SELECT * FROM table WHERE id = ?', [id]);

// 执行写入（INSERT/UPDATE/DELETE）
const result = run('INSERT INTO table (col) VALUES (?)', [value]);
// result.lastInsertRowid 为新插入的 ID

// 记录操作日志
log({ operator: '操作人', action: '操作类型', target: '对象', detail: '详情' });
```

#### 操作日志

所有增删改操作都应调用 `log()` 记录审计日志：
- `operator`: 操作人用户名
- `action`: 操作类型（如 "新增客户"、"编辑保单"）
- `target`: 操作对象标识（如客户名、保单号）
- `detail`: 补充描述（可选）

### 4.2 前端开发

#### 新增页面

1. 在 `client/src/pages/` 创建页面目录和 `index.jsx`
2. 在 `client/src/services/api.js` 添加 API 调用函数
3. 在 `client/src/app.jsx` 添加路由和菜单项

#### 组件使用

使用 Ant Design ProComponents 提供的高级组件：

```jsx
// 列表页
import { ProTable } from '@ant-design/pro-components';
<ProTable
  headerTitle="页面标题"
  columns={columns}
  request={async (params) => {
    const res = await getData(params);
    return { data: res.data, total: res.total, success: true };
  }}
/>

// 表单弹窗
import { ModalForm, ProFormText } from '@ant-design/pro-components';
<ModalForm onFinish={async (values) => { /* submit */ return true; }}>
  <ProFormText name="field" label="字段" rules={[{ required: true }]} />
</ModalForm>
```

#### 样式规范

- 使用 Ant Design 内置的 token 和颜色系统
- 状态标签颜色：`green`=正常、`red`=异常、`blue`=进行中、`default`=已结束
- 表格操作列：编辑（type="link"）、删除（type="link" danger）

### 4.3 数据库变更

修改表结构后，需要：

1. 修改 `database.js` 中的 CREATE TABLE 语句
2. 删除 `server/database.sqlite` 文件
3. 重新执行 `npm run seed -w server`

---

## 5. API 接口测试

### 使用 curl 测试

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

# 用户登录
curl -X POST http://localhost:3001/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}'

# 查看操作日志
curl "http://localhost:3001/api/logs?page=1&pageSize=20"
```

### 响应格式

列表接口统一返回：
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "pageSize": 10
}
```

错误响应：
```json
{
  "error": "错误描述"
}
```

---

## 6. 生产部署

### 6.1 构建前端

```bash
npm run build -w client
```

构建产物在 `client/dist/` 目录。

### 6.2 切换到 MySQL

1. 安装 MySQL 并创建数据库：
   ```sql
   CREATE DATABASE car_insurance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. 设置环境变量：
   ```bash
   export DB_DIALECT=mysql
   export DB_HOST=localhost
   export DB_PORT=3306
   export DB_NAME=car_insurance
   export DB_USER=root
   export DB_PASSWORD=your_password
   ```

3. 在 `server/package.json` 添加 MySQL 驱动：
   ```bash
   npm install mysql2 -w server
   ```

4. 修改 `server/src/database.js` 中的连接配置

### 6.3 进程管理（推荐 PM2）

```bash
npm install -g pm2

# 启动后端
pm2 start "npm run start -w server" --name car-insurance-api

# 静态文件服务（前端）
pm2 serve client/dist 80 --name car-insurance-web
```

### 6.4 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/car/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # API 代理
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
确保 Node.js 在 PATH 中。如果使用 nvm，运行：
```bash
export PATH="/d/nvm/nodejs:$PATH"  # Git Bash
```

### Q: 前端页面空白
检查后端是否已启动，以及 Vite 代理是否正确配置（默认代理 /api → localhost:3001）。

### Q: 数据库文件在哪
SQLite 数据库文件在 `server/database.sqlite`。删除此文件并重新 seed 即可重置数据。

### Q: 如何重置所有数据
```bash
rm server/database.sqlite
npm run seed -w server
```

### Q: 端口被占用
```bash
# 修改后端端口
export PORT=3002 && npm run dev -w server

# 修改前端端口（vite.config.js）
server: { port: 5174 }
```
