# DriveEase 数据库迁移指南：sql.js → PostgreSQL

> 当前后端用 **TypeORM + sqljs 驱动**（SQLite WASM，单文件 `server/database.sqlite`，整库驻留内存、每次写整文件回写）。适合开发/Demo，但**不适合生产**。本文给出迁移到 **PostgreSQL** 的完整步骤。
> 部署本身见 [deployment.md](./deployment.md)。

---

## 1. 为什么要迁移

sql.js 在生产环境的硬限制：

| 问题 | 说明 |
| --- | --- |
| **单实例、不能水平扩展** | 整库在进程内存；多进程/多副本各持一份，写互相覆盖、读不到彼此的写 |
| **每次写整文件回写** | `autoSave` 每次 DML 都 `db.export()` 整文件 `writeFileSync`，数据量上去后 IO/锁开销大 |
| **无并发** | 单连接串行，无法支撑多请求并发写 |
| **无真正的 ACID 事务** | 多步写（`POST /policies/full`、续保）非原子 |
| **`last_insert_rowid()` 易错** | autoSave 的 export 会把 rowid 重置为 0，必须靠 `Repository.save()` 拿新 id（当前已踩坑） |
| **备份/监控/权限** | 单文件，无备份工具链、无细粒度权限、无复制/读写分离 |

迁移到 PostgreSQL 后：多副本水平扩展、真正的并发与事务、`RETURNING`/Repository 原生拿 id、JSONB、成熟的备份与运维。

---

## 2. 迁移总览

三件事，可分阶段：
1. **Schema 迁移**：把 9 张表搬到 Postgres（类型规范化：`SERIAL`/`TIMESTAMPTZ`/`JSONB`/`NUMERIC`，保留中文 CHECK 约束）。
2. **数据迁移**：把 `server/database.sqlite` 的存量数据导入 Postgres（UTF-8 编码、保留中文）。
3. **代码切换**：TypeORM 驱动 `sqljs` → `postgres`，去掉 `autoSave`/`location`；`schema.ts` 的建表逻辑换成 TypeORM migration（`PRAGMA` 是 SQLite 专用）；可选地把 JSON-in-TEXT 升级为 JSONB。

---

## 3. 准备 PostgreSQL

```bash
# 本地（Docker）
docker run -d --name driveease-pg \
  -e POSTGRES_USER=driveease -e POSTGRES_PASSWORD=secret -e POSTGRES_DB=driveease \
  -p 5432:5432 postgres:16

# 或服务器安装后建库
sudo -u postgres psql -c "CREATE USER driveease WITH PASSWORD 'secret';"
sudo -u postgres psql -c "CREATE DATABASE driveease OWNER driveease ENCODING 'UTF8' LC_TYPE 'C.UTF-8' LC_COLLATE 'C.UTF-8' TEMPLATE template0;"
```

连接串：`postgresql://driveease:secret@<host>:5432/driveease`

---

## 4. Schema 迁移

### 4.1 推荐做法：用一份 Postgres DDL（一次性建表）

把下面保存为 `server/migrations/pg-schema.sql`，用 `psql -d driveease -f migrations/pg-schema.sql` 执行。类型已按 Postgres 规范化，**中文 CHECK 约束原样保留**，JSON 列用 `JSONB`，金额用 `NUMERIC(19,4)`（规范推荐，不用浮点）。

```sql
-- ========== 客户 ==========
CREATE TABLE IF NOT EXISTS customer (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT, id_number TEXT, address TEXT,
  birthday DATE, customer_type TEXT,
  business_attribution TEXT, business_area TEXT,
  follow_status JSONB,                 -- 原 JSON 数组字符串 → JSONB
  ssn_front TEXT, ssn_back TEXT, business_license TEXT,
  id_authority TEXT, id_valid_date TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== 车辆 ==========
CREATE TABLE IF NOT EXISTS vehicle (
  id BIGSERIAL PRIMARY KEY,
  plate_number TEXT NOT NULL UNIQUE,
  brand TEXT NOT NULL, model TEXT NOT NULL,
  year INT, vin TEXT, engine_number TEXT,
  customer_id BIGINT NOT NULL REFERENCES customer(id),
  brand_model TEXT, energy_type TEXT, vehicle_type TEXT,
  register_date DATE, certificate_date DATE, next_inspection_date DATE,
  transfer_flag TEXT, seats INT, load_capacity NUMERIC(19,4),
  driving_front TEXT, driving_back TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_vehicle_customer ON vehicle(customer_id);

-- ========== 保单 ==========
CREATE TABLE IF NOT EXISTS policy (
  id BIGSERIAL PRIMARY KEY,
  policy_number TEXT NOT NULL UNIQUE,
  customer_id BIGINT NOT NULL REFERENCES customer(id),
  vehicle_id BIGINT NOT NULL REFERENCES vehicle(id),
  insurance_type TEXT NOT NULL CHECK(insurance_type IN ('交强险','商业险','综合')),
  premium NUMERIC(19,4) NOT NULL,
  sum_insured NUMERIC(19,4) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT '待生效' CHECK(status IN ('生效','待生效','已过期','已退保')),
  remark TEXT,
  issue_time TEXT, policy_date DATE, effective_date DATE, expiry_date DATE,
  certificate_type TEXT, certificate_number TEXT,
  insurance_company TEXT, contact_person TEXT, contact_phone TEXT, sales_person TEXT,
  compulsory_detail JSONB, commercial_detail JSONB,    -- 原 JSON 字符串 → JSONB
  traffic_premium NUMERIC(19,4), travel_tax NUMERIC(19,4),
  commercial_premium NUMERIC(19,4), surcharge_premium NUMERIC(19,4), surcharge_premium2 NUMERIC(19,4),
  commission NUMERIC(19,4), expenses NUMERIC(19,4),
  traffic_rate NUMERIC(19,4), traffic_charge NUMERIC(19,4),
  commercial_rate NUMERIC(19,4), commercial_charge NUMERIC(19,4),
  surcharge_rate NUMERIC(19,4), surcharge_charge NUMERIC(19,4),
  surcharge_rate2 NUMERIC(19,4), surcharge_charge2 NUMERIC(19,4),
  total_charge NUMERIC(19,4),
  quotation TEXT, policy_file TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_policy_customer ON policy(customer_id);
CREATE INDEX idx_policy_vehicle  ON policy(vehicle_id);
CREATE INDEX idx_policy_status   ON policy(status);

-- ========== 续保记录 ==========
CREATE TABLE IF NOT EXISTS renewal_record (
  id BIGSERIAL PRIMARY KEY,
  old_policy_id BIGINT NOT NULL REFERENCES policy(id),
  new_policy_id BIGINT REFERENCES policy(id),
  remind_date DATE NOT NULL,
  status TEXT DEFAULT '待提醒' CHECK(status IN ('待提醒','已提醒','已续保','已过期')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== 用户 ==========
CREATE TABLE IF NOT EXISTS "user" (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  email TEXT, phone TEXT,
  role TEXT NOT NULL DEFAULT '普通员工' CHECK(role IN ('管理员','普通员工')),
  status TEXT NOT NULL DEFAULT '启用' CHECK(status IN ('启用','禁用')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== 操作日志 ==========
CREATE TABLE IF NOT EXISTS operation_log (
  id BIGSERIAL PRIMARY KEY,
  operator TEXT NOT NULL, action TEXT NOT NULL, target TEXT, detail TEXT,
  result TEXT NOT NULL DEFAULT '成功',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== 保险公司 ==========
CREATE TABLE IF NOT EXISTS insurance_company (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE, contact_person TEXT, contact_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== 交强险种 ==========
CREATE TABLE IF NOT EXISTS compulsory_insurance_type (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== 商业险种 ==========
CREATE TABLE IF NOT EXISTS commercial_insurance_type (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT '启用' CHECK(status IN ('启用','禁用')),
  sort_order INT DEFAULT 0, remark TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 参照表默认值（与 schema.ts 一致）
INSERT INTO compulsory_insurance_type(name) VALUES ('交强险'),('代收车船税')
  ON CONFLICT DO NOTHING;
INSERT INTO commercial_insurance_type(name, sort_order, status) VALUES
  ('第三者责任险',10,'启用'),('车辆损失险',20,'启用'),('车上人员责任险（司机）',30,'启用'),
  ('车上人员责任险（乘客）',40,'启用'),('医保外医疗费用责任险',50,'启用'),('划痕险',60,'启用'),
  ('玻璃单独破碎险',70,'启用'),('车身盗抢险',80,'启用')
  ON CONFLICT DO NOTHING;
```

> `user` 是 Postgres 保留字，建表/查询都要加双引号 `"user"`。

### 4.2 备选：TypeORM migration 自动生成

若更想用 TypeORM 管迁移：
```bash
# 在 server/ 增加 DataSource 的独立实例（CLI 用），然后：
npx typeorm migration:generate src/migrations/Init -d src/data-source.ts
npx typeorm migration:run -d src/data-source.ts
```
注意：从实体生成的 DDL **不会**包含中文 CHECK 约束和默认值（实体里没声明），所以推荐用 4.1 的手写 DDL；之后增量改动再用 `migration:generate`。

---

## 5. 数据迁移（sqlite → postgres）

### 方案 A：pgloader（最省事，推荐）
```bash
# 安装 pgloader（macOS: brew install pgloader；Linux: apt install pgloader）
cat > load.load <<EOF
LOAD DATABASE
  FROM sqlite:///绝对路径/server/database.sqlite
  INTO postgresql://driveease:secret@localhost:5432/driveease
WITH include drop, create no tables, truncate, data only, reset sequences
  SET work_mem to '128MB', maintenance_work_mem to '512MB';
EOF
pgloader load.load
```
- `create no tables` + `data only`：用第 4 节已建好的表，只灌数据。
- `reset sequences`：把 `BIGSERIAL` 的 sequence 对齐到迁移后的最大 id（否则后续 INSERT 主键冲突）。
- 中文走 UTF-8，pgloader 默认正确处理。

### 方案 B：dump + 改写 + psql（无 pgloader 时）
```bash
sqlite3 server/database.sqlite .dump --data-only > dump.sql
# 手工：把 INSERT 的表名 "user" 加引号；布尔/类型按需调整；按外键顺序（customer→vehicle→policy→renewal_record）
psql "postgresql://driveease:secret@localhost/driveease" -f dump.sql
# 对齐序列：
psql ... -c "SELECT setval(pg_get_serial_sequence('customer','id'), (SELECT MAX(id) FROM customer));"
# …对每张表重复 setval
```

### 方案 C：TypeORM 脚本（跨库搬运）
写一个一次性脚本：开两个 DataSource（sqljs 读 + postgres 写），按表 `find()` → `save()`。适合需要字段转换（如 `follow_status` 字符串→JSONB）时。

> 迁移后务必校验中文不乱码（`SELECT name FROM customer`）、行数对得上、外键 id 连续。

---

## 6. 代码改动

### 6.1 `server/src/core/database/database.module.ts`（驱动切换）
```ts
// 之前（sql.js）
TypeOrmModule.forRoot({
  type: 'sqljs',
  location: DB_PATH,
  autoSave: true,
  synchronize: false,
  entities: [...],
})

// 之后（Postgres）—— 通过 DATABASE_URL 注入
TypeOrmModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (cfg: ConfigService) => ({
    type: 'postgres',
    url: cfg.get<string>('DATABASE_URL'),     // postgresql://user:pass@host:5432/db
    synchronize: false,                        // 用 migration/DDL 管 schema，绝不 true
    entities: [Customer, Vehicle, Policy, RenewalRecord, User, OperationLog,
               InsuranceCompany, CompulsoryInsuranceType, CommercialInsuranceType],
    logging: cfg.get('NODE_ENV') !== 'production',
  }),
})
```
- **删除** `location` / `autoSave`（Postgres 不需要；写直接落库，无整文件回写）。
- `server/.env` 增加 `DATABASE_URL=postgresql://driveease:secret@host:5432/driveease`。

### 6.2 `schema.ts` / `SchemaBootstrapService`
- `initSchema()` 里的 `CREATE TABLE` + `ensureColumn`（用了 `PRAGMA table_info`）是 **SQLite 专用**。
- 切到 Postgres 后：建表走第 4 节的 DDL（一次性）或 TypeORM migration；`ensureColumn` 改用 Postgres 的 `information_schema.columns` 判断，或直接用 migration 管理。
- 最简单：保留 `SchemaBootstrapService` 但让它仅在 sql.js 模式下跑（用 `ConfigService` 判断驱动类型）；Postgres 模式下依赖 migration。

### 6.3 实体调整（可选但推荐）
- JSON-in-TEXT 列 → JSONB：`compulsoryDetail`、`commercialDetail`、`followStatus` 的 `@Column({ name, type: 'jsonb', nullable: true })`，TS 类型 `Record<string,any> | any[] | null`。**注意**：响应拦截器的 `deepCamelKeys` 对 JSONB 对象会递归转其内部键（不像字符串那样跳过）—— 升级 JSONB 后确认前端对内部键大小写的预期。
- 时间列：若 DDL 用了 `DATE`/`TIMESTAMPTZ`，实体类型由 `string` 改 `Date`（响应会变成 ISO 字符串，前端展示通常无碍；若要保持 `'YYYY-MM-DD HH:MM:SS'` 则 DDL 继续用 `TEXT`）。
- 金额列 `REAL` → `NUMERIC(19,4)`：实体 `number` 不变，Postgres 返回的是 number。

### 6.4 `lastInsertRowid` 坑消失
Postgres 下 `Repository.save()` 用 `RETURNING` 原生拿回 id，`SELECT last_insert_rowid()` 本就不存在。现有用 `Repository.save` 拿 id 的代码（policies/renewals 的插入路径）**无需改动**；原生 `dataSource.query` 插入若要 id，可用 `INSERT ... RETURNING id`。

### 6.5 搜索大小写（可选）
SQLite `LIKE` 对 ASCII 大小写不敏感、对中文无影响；Postgres `LIKE` **大小写敏感**。中文不受影响，但若以后有英文关键字搜索，把 QueryBuilder 的 `LIKE` 换成 `ILIKE`。

### 6.6 `seed.ts`
仍可用 `createApplicationContext(AppModule)`，但 `DELETE FROM sqlite_sequence`（SQLite 专用）在 Postgres 上要换成 `TRUNCATE ... RESTART IDENTITY CASCADE`。建议 seed 里按驱动分别处理，或 Postgres 下改用 migration 灌种子。

---

## 7. 类型映射对照（SQLite → PostgreSQL）

| SQLite（现状） | PostgreSQL（目标） | 说明 |
| --- | --- | --- |
| `INTEGER PRIMARY KEY AUTOINCREMENT` | `BIGSERIAL` / `BIGINT GENERATED ALWAYS AS IDENTITY` | 自增主键 |
| `TEXT`（存日期字符串） | `DATE` / `TIMESTAMPTZ` | 规范化；或继续 `TEXT` 保最小改动 |
| `DATETIME DEFAULT CURRENT_TIMESTAMP` | `TIMESTAMPTZ DEFAULT now()` | 时间戳 |
| `REAL`（保费/金额） | `NUMERIC(19,4)` | 避免浮点精度丢失 |
| `TEXT`（JSON 字符串） | `JSONB` | 可索引、可查询 |
| `CHECK(... IN ('生效',...))` | 同 | 中文枚举约束语法一致 |
| `SELECT last_insert_rowid()` | `INSERT ... RETURNING id` | 拿新主键 |

---

## 8. 切换步骤（停服迁移，最稳）

1. **停服**：停掉 Node 进程，确保不再有写。
2. **备份**：`cp server/database.sqlite server/database.sqlite.bak`。
3. **建库建表**：第 3 节建库 + 第 4.1 节 `psql -f pg-schema.sql`。
4. **迁数据**：第 5 节 pgloader（`reset sequences` 必开）。
5. **改代码与配置**：第 6 节；`server/.env` 加 `DATABASE_URL`，重新 `npm run build -w server`。
6. **冒烟**：临时起服务 `DATABASE_URL=... node server/dist/main.js`，curl `/api/v1/stats/dashboard`、登录、保单列表、`POST /policies/full`（验证主键/外键/事务）。
7. **切流量**：验证通过后正式起服，接入 Nginx/负载均衡；此时可水平扩容（Postgres 支持多副本）。
8. **观察**：看日志无 sql.js 相关报错、数据写入正常、`updated_at` 正常刷新。

> 期望“零停机”：可部署双写/影子读方案，但复杂度高，对小项目通常不值得；建议选低峰停服窗口。

---

## 9. 回滚

- 代码回滚：用迁移前的构建产物（仍连 sql.js）。
- 数据回滚：若迁移后只读验证期，直接切回 `database.sqlite.bak`；若已有新写入，需把 Postgres 增量反向同步回 sqlite（一般无此必要，保留 sql.js 版本作冷备即可）。

---

## 10. 验证清单

- [ ] 9 张表 + 索引 + 中文 CHECK 约束存在（`\d policy` 看到 CHECK）。
- [ ] 各表行数与 sqlite 源一致；中文无乱码。
- [ ] 序列已对齐（`INSERT` 一条新记录，主键 = max+1，不冲突）。
- [ ] `POST /api/v1/users/login`（admin/123456）成功。
- [ ] `GET /api/v1/stats/dashboard` 数字正确。
- [ ] `POST /api/v1/policies/full` 成功且返回非零 `policyId`（验证 RETURNING / Repository.save）。
- [ ] `GET /api/v1/policies?keyword=...` 跨表搜索正常。
- [ ] 写入后 `created_at`/`updated_at` 由 DB 默认值/`now()` 正常填充。
- [ ] 重启服务后数据仍在（Postgres 持久化）。
- [ ] 多实例/多请求并发写无互相覆盖（迁移到 Postgres 的核心收益）。
