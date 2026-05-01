import { initDB, run } from './database.js';
import crypto from 'crypto';

function hashPassword(pwd) {
  return crypto.createHash('sha256').update(pwd).digest('hex');
}

async function seed() {
  await initDB();

  run('DELETE FROM operation_log');
  run('DELETE FROM renewal_record');
  run('DELETE FROM policy');
  run('DELETE FROM vehicle');
  run('DELETE FROM customer');
  run('DELETE FROM insurance_company');
  run('DELETE FROM compulsory_insurance_type');
  run('DELETE FROM commercial_insurance_type');
  run('DELETE FROM user');
  run('DELETE FROM sqlite_sequence');

  // Users (password: 123456)
  const pwdHash = hashPassword('123456');
  run(`INSERT INTO user (username, password, email, phone, role, status) VALUES ('admin', '${pwdHash}', 'admin@insurance.com', '13800000001', '管理员', '启用')`);
  run(`INSERT INTO user (username, password, email, phone, role, status) VALUES ('zhangsan', '${pwdHash}', 'zhangsan@insurance.com', '13800000002', '普通员工', '启用')`);
  run(`INSERT INTO user (username, password, email, phone, role, status) VALUES ('lisi', '${pwdHash}', 'lisi@insurance.com', '13800000003', '普通员工', '启用')`);
  run(`INSERT INTO user (username, password, email, phone, role, status) VALUES ('wangwu', '${pwdHash}', 'wangwu@insurance.com', '13800000004', '管理员', '启用')`);
  run(`INSERT INTO user (username, password, email, phone, role, status) VALUES ('zhaoliu', '${pwdHash}', 'zhaoliu@insurance.com', '13800000005', '普通员工', '禁用')`);

  // Customers
  run(`INSERT INTO customer (name, phone, email, id_number, address) VALUES ('张三', '13800138001', 'zhangsan@test.com', '110101199001011234', '北京市朝阳区建国路88号')`);
  run(`INSERT INTO customer (name, phone, email, id_number, address) VALUES ('李四', '13800138002', 'lisi@test.com', '310101199203022345', '上海市浦东新区陆家嘴路100号')`);
  run(`INSERT INTO customer (name, phone, email, id_number, address) VALUES ('王五', '13800138003', 'wangwu@test.com', '440101198812033456', '广州市天河区天河路200号')`);
  run(`INSERT INTO customer (name, phone, email, id_number, address) VALUES ('赵六', '13800138004', 'zhaoliu@test.com', '500101199505044567', '重庆市渝中区解放碑路50号')`);
  run(`INSERT INTO customer (name, phone, email, id_number, address) VALUES ('钱七', '13800138005', 'qianqi@test.com', '330101199106055678', '杭州市西湖区文三路300号')`);

  // Vehicles
  run(`INSERT INTO vehicle (plate_number, brand, model, year, vin, engine_number, customer_id) VALUES ('京A12345', '大众', '帕萨特', 2022, 'WVWZZZ3CZWE123456', 'ENG001', 1)`);
  run(`INSERT INTO vehicle (plate_number, brand, model, year, vin, engine_number, customer_id) VALUES ('沪B67890', '丰田', '凯美瑞', 2023, '4T1BF1FK5EU654321', 'ENG002', 2)`);
  run(`INSERT INTO vehicle (plate_number, brand, model, year, vin, engine_number, customer_id) VALUES ('粤C11111', '宝马', '3系', 2021, 'WBA8E9C50GU789012', 'ENG003', 3)`);
  run(`INSERT INTO vehicle (plate_number, brand, model, year, vin, engine_number, customer_id) VALUES ('渝D22222', '奔驰', 'C级', 2023, 'WDD2050351F234567', 'ENG004', 4)`);
  run(`INSERT INTO vehicle (plate_number, brand, model, year, vin, engine_number, customer_id) VALUES ('浙E33333', '奥迪', 'A4L', 2022, 'WAUAD38H0KA123456', 'ENG005', 5)`);

  // Commercial insurance types
  ['交强险', '代收车船税'].forEach((name) => {
    run(`INSERT INTO compulsory_insurance_type (name, is_common) VALUES ('${name}', 1)`);
  });

  [
    ['第三者责任险', 10, 1],
    ['车辆损失险', 20, 1],
    ['车上人员责任险（司机）', 30, 0],
    ['车上人员责任险（乘客）', 40, 0],
    ['医保外医疗费用责任险', 50, 0],
    ['划痕险', 60, 0],
    ['玻璃单独破碎险', 70, 0],
    ['车身盗抢险', 80, 0],
  ].forEach(([name, sortOrder, isCommon]) => {
    run(`INSERT INTO commercial_insurance_type (name, sort_order, status, is_common) VALUES ('${name}', ${sortOrder}, '启用', ${isCommon})`);
  });

  [
    ['平安保险', '王经理', '13810000001'],
    ['太平洋保险', '李经理', '13810000002'],
    ['人保财险', '赵经理', '13810000003'],
  ].forEach(([name, contact, phone]) => {
    run(`INSERT INTO insurance_company (name, contact_person, contact_phone) VALUES ('${name}', '${contact}', '${phone}')`);
  });

  // Policies
  run(`INSERT INTO policy (policy_number, customer_id, vehicle_id, insurance_type, premium, sum_insured, start_date, end_date, status) VALUES ('POL-2024-001', 1, 1, '综合', 5680.00, 200000.00, '2024-06-01', '2025-06-01', '生效')`);
  run(`INSERT INTO policy (policy_number, customer_id, vehicle_id, insurance_type, premium, sum_insured, start_date, end_date, status) VALUES ('POL-2024-002', 2, 2, '商业险', 4200.00, 150000.00, '2024-08-15', '2025-08-15', '生效')`);
  run(`INSERT INTO policy (policy_number, customer_id, vehicle_id, insurance_type, premium, sum_insured, start_date, end_date, status) VALUES ('POL-2025-003', 3, 3, '交强险', 950.00, 200000.00, '2025-01-10', '2026-01-10', '生效')`);
  run(`INSERT INTO policy (policy_number, customer_id, vehicle_id, insurance_type, premium, sum_insured, start_date, end_date, status) VALUES ('POL-2025-004', 1, 1, '交强险', 950.00, 200000.00, '2025-05-20', '2026-05-20', '待生效')`);
  run(`INSERT INTO policy (policy_number, customer_id, vehicle_id, insurance_type, premium, sum_insured, start_date, end_date, status) VALUES ('POL-2024-005', 4, 4, '综合', 7200.00, 250000.00, '2024-03-01', '2025-03-01', '已过期')`);
  run(`INSERT INTO policy (policy_number, customer_id, vehicle_id, insurance_type, premium, sum_insured, start_date, end_date, status) VALUES ('POL-2025-006', 5, 5, '商业险', 4800.00, 180000.00, '2025-04-01', '2026-04-01', '生效')`);

  // Renewal records
  run(`INSERT INTO renewal_record (old_policy_id, remind_date, status, note) VALUES (1, '2025-05-01', '已提醒', '张三的帕萨特综合险即将到期')`);
  run(`INSERT INTO renewal_record (old_policy_id, remind_date, status, note) VALUES (2, '2025-07-15', '待提醒', '李四的凯美瑞商业险即将到期')`);
  run(`INSERT INTO renewal_record (old_policy_id, remind_date, status, note) VALUES (5, '2025-02-01', '已过期', '赵六的奔驰C级综合险已过期')`);

  // Operation logs
  run(`INSERT INTO operation_log (operator, action, target, detail, result, created_at) VALUES ('admin', '新增用户', 'zhangsan', '创建普通员工账号', '成功', '2026-04-28 09:00:01')`);
  run(`INSERT INTO operation_log (operator, action, target, detail, result, created_at) VALUES ('admin', '新增用户', 'lisi', '创建普通员工账号', '成功', '2026-04-28 09:05:02')`);
  run(`INSERT INTO operation_log (operator, action, target, detail, result, created_at) VALUES ('admin', '新增用户', 'wangwu', '创建管理员账号', '成功', '2026-04-28 09:10:03')`);
  run(`INSERT INTO operation_log (operator, action, target, detail, result, created_at) VALUES ('zhangsan', '新增客户', '张三', '', '成功', '2026-04-28 10:00:01')`);
  run(`INSERT INTO operation_log (operator, action, target, detail, result, created_at) VALUES ('zhangsan', '新增客户', '李四', '', '成功', '2026-04-28 10:05:02')`);
  run(`INSERT INTO operation_log (operator, action, target, detail, result, created_at) VALUES ('lisi', '新增客户', '王五', '', '成功', '2026-04-28 10:10:03')`);
  run(`INSERT INTO operation_log (operator, action, target, detail, result, created_at) VALUES ('zhangsan', '新增保单', 'POL-2024-001', '张三 京A12345 综合险', '成功', '2026-04-28 11:00:01')`);
  run(`INSERT INTO operation_log (operator, action, target, detail, result, created_at) VALUES ('lisi', '新增保单', 'POL-2024-002', '李四 沪B67890 商业险', '成功', '2026-04-28 11:05:02')`);
  run(`INSERT INTO operation_log (operator, action, target, detail, result, created_at) VALUES ('wangwu', '编辑用户', 'zhaoliu', '状态: 启用 → 禁用', '成功', '2026-04-28 14:00:01')`);
  run(`INSERT INTO operation_log (operator, action, target, detail, result, created_at) VALUES ('admin', '新增用户', 'zhaoliu', '创建普通员工账号', '成功', '2026-04-28 14:30:01')`);

  console.log('Seed completed:');
  console.log('  5 users (admin/123456), 5 customers, 5 vehicles, 8 commercial insurance types, 6 policies, 3 renewal records, 10 logs');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
