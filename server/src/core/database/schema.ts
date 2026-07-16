import { DataSource } from 'typeorm';

/**
 * schema 初始化（建表 + ensureColumn + 参照表播种）。供 SchemaBootstrapService 与 seed.ts 复用。
 * 内容与原 database.js 完全一致：中文 CHECK 约束、~40 个 ensureColumn 列。
 */
export async function initSchema(dataSource: DataSource): Promise<void> {
  const q = (sql: string, params?: any[]) => dataSource.query(sql, params);

  await q(`
    CREATE TABLE IF NOT EXISTS customer (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT, id_number TEXT, address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await q(`
    CREATE TABLE IF NOT EXISTS vehicle (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plate_number TEXT NOT NULL UNIQUE, brand TEXT NOT NULL, model TEXT NOT NULL,
      year INTEGER, vin TEXT, engine_number TEXT, customer_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customer(id)
    )
  `);
  await q(`
    CREATE TABLE IF NOT EXISTS policy (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      policy_number TEXT NOT NULL UNIQUE, customer_id INTEGER NOT NULL, vehicle_id INTEGER NOT NULL,
      insurance_type TEXT NOT NULL CHECK(insurance_type IN ('交强险', '商业险', '综合')),
      premium REAL NOT NULL, sum_insured REAL NOT NULL, start_date TEXT NOT NULL, end_date TEXT NOT NULL,
      status TEXT DEFAULT '待生效' CHECK(status IN ('生效', '待生效', '已过期', '已退保')),
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customer(id), FOREIGN KEY (vehicle_id) REFERENCES vehicle(id)
    )
  `);

  await ensureColumn(dataSource, 'policy', 'issue_time', 'TEXT');
  await ensureColumn(dataSource, 'policy', 'policy_date', 'TEXT');
  await ensureColumn(dataSource, 'policy', 'effective_date', 'TEXT');
  await ensureColumn(dataSource, 'policy', 'expiry_date', 'TEXT');
  await ensureColumn(dataSource, 'policy', 'certificate_type', 'TEXT');
  await ensureColumn(dataSource, 'policy', 'certificate_number', 'TEXT');
  await ensureColumn(dataSource, 'policy', 'insurance_company', 'TEXT');
  await ensureColumn(dataSource, 'policy', 'contact_person', 'TEXT');
  await ensureColumn(dataSource, 'policy', 'contact_phone', 'TEXT');
  await ensureColumn(dataSource, 'policy', 'sales_person', 'TEXT');
  await ensureColumn(dataSource, 'policy', 'compulsory_detail', 'TEXT');
  await ensureColumn(dataSource, 'policy', 'commercial_detail', 'TEXT');

  await ensureColumn(dataSource, 'customer', 'birthday', 'TEXT');
  await ensureColumn(dataSource, 'customer', 'customer_type', 'TEXT');
  await ensureColumn(dataSource, 'customer', 'business_attribution', 'TEXT');
  await ensureColumn(dataSource, 'customer', 'business_area', 'TEXT');
  await ensureColumn(dataSource, 'customer', 'follow_status', 'TEXT');
  await ensureColumn(dataSource, 'vehicle', 'brand_model', 'TEXT');
  await ensureColumn(dataSource, 'vehicle', 'energy_type', 'TEXT');
  await ensureColumn(dataSource, 'vehicle', 'vehicle_type', 'TEXT');
  await ensureColumn(dataSource, 'vehicle', 'register_date', 'TEXT');
  await ensureColumn(dataSource, 'vehicle', 'certificate_date', 'TEXT');
  await ensureColumn(dataSource, 'vehicle', 'next_inspection_date', 'TEXT');
  await ensureColumn(dataSource, 'vehicle', 'transfer_flag', 'TEXT');
  await ensureColumn(dataSource, 'vehicle', 'seats', 'INTEGER');
  await ensureColumn(dataSource, 'vehicle', 'load_capacity', 'REAL');
  await ensureColumn(dataSource, 'policy', 'traffic_premium', 'REAL');
  await ensureColumn(dataSource, 'policy', 'travel_tax', 'REAL');
  await ensureColumn(dataSource, 'policy', 'commercial_premium', 'REAL');
  await ensureColumn(dataSource, 'policy', 'surcharge_premium', 'REAL');
  await ensureColumn(dataSource, 'policy', 'surcharge_premium2', 'REAL');
  await ensureColumn(dataSource, 'policy', 'commission', 'REAL');
  await ensureColumn(dataSource, 'policy', 'expenses', 'REAL');
  await ensureColumn(dataSource, 'policy', 'traffic_rate', 'REAL');
  await ensureColumn(dataSource, 'policy', 'traffic_charge', 'REAL');
  await ensureColumn(dataSource, 'policy', 'commercial_rate', 'REAL');
  await ensureColumn(dataSource, 'policy', 'commercial_charge', 'REAL');
  await ensureColumn(dataSource, 'policy', 'surcharge_rate', 'REAL');
  await ensureColumn(dataSource, 'policy', 'surcharge_charge', 'REAL');
  await ensureColumn(dataSource, 'policy', 'surcharge_rate2', 'REAL');
  await ensureColumn(dataSource, 'policy', 'surcharge_charge2', 'REAL');
  await ensureColumn(dataSource, 'policy', 'total_charge', 'REAL');
  await ensureColumn(dataSource, 'customer', 'ssn_front', 'TEXT');
  await ensureColumn(dataSource, 'customer', 'business_license', 'TEXT');
  await ensureColumn(dataSource, 'customer', 'ssn_back', 'TEXT');
  await ensureColumn(dataSource, 'customer', 'id_authority', 'TEXT');
  await ensureColumn(dataSource, 'customer', 'id_valid_date', 'TEXT');
  await ensureColumn(dataSource, 'vehicle', 'driving_front', 'TEXT');
  await ensureColumn(dataSource, 'vehicle', 'driving_back', 'TEXT');
  await ensureColumn(dataSource, 'policy', 'quotation', 'TEXT');
  await ensureColumn(dataSource, 'policy', 'policy_file', 'TEXT');

  await q(`
    CREATE TABLE IF NOT EXISTS renewal_record (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      old_policy_id INTEGER NOT NULL, new_policy_id INTEGER, remind_date TEXT NOT NULL,
      status TEXT DEFAULT '待提醒' CHECK(status IN ('待提醒', '已提醒', '已续保', '已过期')),
      note TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (old_policy_id) REFERENCES policy(id), FOREIGN KEY (new_policy_id) REFERENCES policy(id)
    )
  `);
  await q(`
    CREATE TABLE IF NOT EXISTS user (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE, password TEXT NOT NULL, email TEXT, phone TEXT,
      role TEXT NOT NULL DEFAULT '普通员工' CHECK(role IN ('管理员', '普通员工')),
      status TEXT NOT NULL DEFAULT '启用' CHECK(status IN ('启用', '禁用')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // RBAC：user 关联 role（role_id）；保留旧 role 列作显示兼容，权限一律走 role_id
  await ensureColumn(dataSource, 'user', 'role_id', 'INTEGER');

  await q(`
    CREATE TABLE IF NOT EXISTS role (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE, code TEXT NOT NULL UNIQUE,
      is_built_in INTEGER NOT NULL DEFAULT 0, description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await q(`
    CREATE TABLE IF NOT EXISTS permission (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('menu', 'action')), module TEXT, sort INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await q(`
    CREATE TABLE IF NOT EXISTS role_permission (
      role_id INTEGER NOT NULL, permission_id INTEGER NOT NULL,
      PRIMARY KEY (role_id, permission_id),
      FOREIGN KEY (role_id) REFERENCES role(id),
      FOREIGN KEY (permission_id) REFERENCES permission(id)
    )
  `);
  await q(`
    CREATE TABLE IF NOT EXISTS operation_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operator TEXT NOT NULL, action TEXT NOT NULL, target TEXT, detail TEXT,
      result TEXT NOT NULL DEFAULT '成功', created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await q(`
    CREATE TABLE IF NOT EXISTS insurance_company (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE, contact_person TEXT, contact_phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await q(`
    CREATE TABLE IF NOT EXISTS compulsory_insurance_type (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await q(`
    CREATE TABLE IF NOT EXISTS commercial_insurance_type (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT '启用' CHECK(status IN ('启用', '禁用')),
      sort_order INTEGER DEFAULT 0, remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 参照表空表时播种
  const compulsoryCount = (await q('SELECT COUNT(*) as count FROM compulsory_insurance_type')) as any[];
  if ((compulsoryCount[0]?.count ?? 0) === 0) {
    for (const name of ['交强险', '代收车船税']) {
      await q('INSERT INTO compulsory_insurance_type (name) VALUES (?)', [name]);
    }
  }
  const commercialCount = (await q('SELECT COUNT(*) as count FROM commercial_insurance_type')) as any[];
  if ((commercialCount[0]?.count ?? 0) === 0) {
    const rows: [string, number][] = [
      ['第三者责任险', 10], ['车辆损失险', 20], ['车上人员责任险（司机）', 30],
      ['车上人员责任险（乘客）', 40], ['医保外医疗费用责任险', 50], ['划痕险', 60],
      ['玻璃单独破碎险', 70], ['车身盗抢险', 80],
    ];
    for (const [name, sortOrder] of rows) {
      await q('INSERT INTO commercial_insurance_type (name, sort_order) VALUES (?, ?)', [name, sortOrder]);
    }
  }
}

export async function ensureColumn(
  dataSource: DataSource,
  tableName: string,
  columnName: string,
  definition: string,
): Promise<void> {
  const columns = (await dataSource.query(`PRAGMA table_info(${tableName})`)) as any[];
  const exists = columns.some((c: any) => c.name === columnName);
  if (!exists) {
    await dataSource.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}
