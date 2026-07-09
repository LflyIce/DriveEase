import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'database.sqlite');

let db;

export async function initDB() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS customer (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      id_number TEXT,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS vehicle (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plate_number TEXT NOT NULL UNIQUE,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      year INTEGER,
      vin TEXT,
      engine_number TEXT,
      customer_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customer(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS policy (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      policy_number TEXT NOT NULL UNIQUE,
      customer_id INTEGER NOT NULL,
      vehicle_id INTEGER NOT NULL,
      insurance_type TEXT NOT NULL CHECK(insurance_type IN ('交强险', '商业险', '综合')),
      premium REAL NOT NULL,
      sum_insured REAL NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT DEFAULT '待生效' CHECK(status IN ('生效', '待生效', '已过期', '已退保')),
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customer(id),
      FOREIGN KEY (vehicle_id) REFERENCES vehicle(id)
    )
  `);

  ensureColumn('policy', 'issue_time', 'TEXT');
  ensureColumn('policy', 'policy_date', 'TEXT');
  ensureColumn('policy', 'effective_date', 'TEXT');
  ensureColumn('policy', 'expiry_date', 'TEXT');
  ensureColumn('policy', 'certificate_type', 'TEXT');
  ensureColumn('policy', 'certificate_number', 'TEXT');
  ensureColumn('policy', 'insurance_company', 'TEXT');
  ensureColumn('policy', 'contact_person', 'TEXT');
  ensureColumn('policy', 'contact_phone', 'TEXT');
  ensureColumn('policy', 'sales_person', 'TEXT');
  ensureColumn('policy', 'compulsory_detail', 'TEXT');
  ensureColumn('policy', 'commercial_detail', 'TEXT');

  // —— 保单录入页扩展字段（客户+车辆+保费一体表单）——
  // customer：客户扩展信息
  ensureColumn('customer', 'birthday', 'TEXT');
  ensureColumn('customer', 'customer_type', 'TEXT');
  ensureColumn('customer', 'business_attribution', 'TEXT');
  ensureColumn('customer', 'business_area', 'TEXT');
  ensureColumn('customer', 'follow_status', 'TEXT'); // 多选状态，存 JSON 数组字符串
  // vehicle：车辆扩展信息
  ensureColumn('vehicle', 'brand_model', 'TEXT'); // 厂牌型号
  ensureColumn('vehicle', 'energy_type', 'TEXT'); // 油电分类
  ensureColumn('vehicle', 'vehicle_type', 'TEXT'); // 车辆种类
  ensureColumn('vehicle', 'register_date', 'TEXT'); // 初登日期
  ensureColumn('vehicle', 'certificate_date', 'TEXT'); // 发证日期
  ensureColumn('vehicle', 'next_inspection_date', 'TEXT'); // 下次年审
  ensureColumn('vehicle', 'transfer_flag', 'TEXT'); // 过户标识 Y/N
  ensureColumn('vehicle', 'seats', 'INTEGER'); // 座位数
  ensureColumn('vehicle', 'load_capacity', 'REAL'); // 核定载质量
  // policy：保费/手续费明细（平铺金额，替代旧 JSON 明细行）
  ensureColumn('policy', 'traffic_premium', 'REAL'); // 交强险保费
  ensureColumn('policy', 'travel_tax', 'REAL'); // 车船税
  ensureColumn('policy', 'commercial_premium', 'REAL'); // 商业险保费
  ensureColumn('policy', 'surcharge_premium', 'REAL'); // 非车保费
  ensureColumn('policy', 'surcharge_premium2', 'REAL'); // 非车2保费
  ensureColumn('policy', 'commission', 'REAL'); // 手续费
  ensureColumn('policy', 'expenses', 'REAL'); // 支出
  ensureColumn('policy', 'traffic_rate', 'REAL'); // 交强费率
  ensureColumn('policy', 'traffic_charge', 'REAL'); // 交强手续费
  ensureColumn('policy', 'commercial_rate', 'REAL'); // 商业费率
  ensureColumn('policy', 'commercial_charge', 'REAL'); // 商业手续费
  ensureColumn('policy', 'surcharge_rate', 'REAL'); // 非车费率
  ensureColumn('policy', 'surcharge_charge', 'REAL'); // 非车手续费
  ensureColumn('policy', 'surcharge_rate2', 'REAL'); // 非车2费率
  ensureColumn('policy', 'surcharge_charge2', 'REAL'); // 非车2手续费
  ensureColumn('policy', 'total_charge', 'REAL'); // 手续费总计
  // 材料上传 URL（COS 直链，按归属分表）
  ensureColumn('customer', 'ssn_front', 'TEXT'); // 身份证正面
  ensureColumn('customer', 'ssn_back', 'TEXT'); // 身份证反面
  ensureColumn('customer', 'business_license', 'TEXT'); // 营业执照
  ensureColumn('customer', 'id_authority', 'TEXT'); // 证件签发机关（身份证反面识别）
  ensureColumn('customer', 'id_valid_date', 'TEXT'); // 证件有效期（身份证反面识别）
  ensureColumn('vehicle', 'driving_front', 'TEXT'); // 行驶证正页
  ensureColumn('vehicle', 'driving_back', 'TEXT'); // 行驶证副页
  ensureColumn('policy', 'quotation', 'TEXT'); // 其他承保材料
  ensureColumn('policy', 'policy_file', 'TEXT'); // 电子保单

  db.run(`
    CREATE TABLE IF NOT EXISTS renewal_record (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      old_policy_id INTEGER NOT NULL,
      new_policy_id INTEGER,
      remind_date TEXT NOT NULL,
      status TEXT DEFAULT '待提醒' CHECK(status IN ('待提醒', '已提醒', '已续保', '已过期')),
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (old_policy_id) REFERENCES policy(id),
      FOREIGN KEY (new_policy_id) REFERENCES policy(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS user (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      role TEXT NOT NULL DEFAULT '普通员工' CHECK(role IN ('管理员', '普通员工')),
      status TEXT NOT NULL DEFAULT '启用' CHECK(status IN ('启用', '禁用')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS operation_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operator TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT,
      detail TEXT,
      result TEXT NOT NULL DEFAULT '成功',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS insurance_company (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      contact_person TEXT,
      contact_phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS compulsory_insurance_type (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS commercial_insurance_type (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT '启用' CHECK(status IN ('启用', '禁用')),
      sort_order INTEGER DEFAULT 0,
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const compulsoryTypeCount = get('SELECT COUNT(*) as count FROM compulsory_insurance_type')?.count || 0;
  if (compulsoryTypeCount === 0) {
    ['交强险', '代收车船税'].forEach((name) => {
      db.run('INSERT INTO compulsory_insurance_type (name) VALUES (?)', [name]);
    });
  }

  const commercialTypeCount = get('SELECT COUNT(*) as count FROM commercial_insurance_type')?.count || 0;
  if (commercialTypeCount === 0) {
    [
      ['第三者责任险', 10],
      ['车辆损失险', 20],
      ['车上人员责任险（司机）', 30],
      ['车上人员责任险（乘客）', 40],
      ['医保外医疗费用责任险', 50],
      ['划痕险', 60],
      ['玻璃单独破碎险', 70],
      ['车身盗抢险', 80],
    ].forEach(([name, sortOrder]) => {
      db.run('INSERT INTO commercial_insurance_type (name, sort_order) VALUES (?, ?)', [name, sortOrder]);
    });
  }

  save();
  console.log('Database initialized');
  return db;
}

export function getDB() {
  return db;
}

function ensureColumn(tableName, columnName, definition) {
  const columns = all(`PRAGMA table_info(${tableName})`);
  const exists = columns.some((column) => column.name === columnName);
  if (!exists) {
    db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

export function save() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

export function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

export function run(sql, params = []) {
  db.run(sql, params);
  // 必须在 save()（db.export）之前读取，否则 last_insert_rowid 会被重置为 0
  const lastInsertRowid = getDB().exec(
    'SELECT last_insert_rowid() as id',
  )[0]?.values[0]?.[0];
  save();
  return { lastInsertRowid };
}

export function get(sql, params = []) {
  const rows = all(sql, params);
  return rows[0] || null;
}

export function log(operation, result = '成功') {
  const { operator, action, target, detail } = operation;
  run(
    'INSERT INTO operation_log (operator, action, target, detail, result) VALUES (?, ?, ?, ?, ?)',
    [operator || '系统', action, target || '', detail || '', result]
  );
}
