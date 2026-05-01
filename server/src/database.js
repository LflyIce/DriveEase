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
      is_common INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS commercial_insurance_type (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT '启用' CHECK(status IN ('启用', '禁用')),
      is_common INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  ensureColumn('compulsory_insurance_type', 'is_common', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('commercial_insurance_type', 'is_common', 'INTEGER NOT NULL DEFAULT 0');

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
  save();
  return { lastInsertRowid: getDB().exec('SELECT last_insert_rowid() as id')[0]?.values[0]?.[0] };
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
