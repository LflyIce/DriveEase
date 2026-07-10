import crypto from 'crypto';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';

function hashPassword(pwd: string): string {
  return crypto.createHash('sha256').update(pwd).digest('hex');
}

async function seed(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('禁止在生产环境运行 seed（会清空全表）');
  }

  // 复用 AppModule 的 TypeORM 配置；createApplicationContext 会触发 SchemaBootstrapService 建表
  const appCtx = await NestFactory.createApplicationContext(AppModule);
  const dataSource = appCtx.get(DataSource);
  const q = (sql: string, params?: any[]) => dataSource.query(sql, params);

  try {
    // 清空（先子后父；重置自增）
    await q('DELETE FROM operation_log');
    await q('DELETE FROM renewal_record');
    await q('DELETE FROM policy');
    await q('DELETE FROM vehicle');
    await q('DELETE FROM customer');
    await q('DELETE FROM insurance_company');
    await q('DELETE FROM compulsory_insurance_type');
    await q('DELETE FROM commercial_insurance_type');
    await q('DELETE FROM user');
    await q('DELETE FROM sqlite_sequence');

    // 用户（密码均为 123456）
    const pwdHash = hashPassword('123456');
    const users = [
      ['admin', 'admin@insurance.com', '13800000001', '管理员', '启用'],
      ['zhangsan', 'zhangsan@insurance.com', '13800000002', '普通员工', '启用'],
      ['lisi', 'lisi@insurance.com', '13800000003', '普通员工', '启用'],
      ['wangwu', 'wangwu@insurance.com', '13800000004', '管理员', '启用'],
      ['zhaoliu', 'zhaoliu@insurance.com', '13800000005', '普通员工', '禁用'],
    ];
    for (const [username, email, phone, role, status] of users) {
      await q(
        'INSERT INTO user (username, password, email, phone, role, status) VALUES (?, ?, ?, ?, ?, ?)',
        [username, pwdHash, email, phone, role, status],
      );
    }

    // 客户
    const customers = [
      ['张三', '13800138001', 'zhangsan@test.com', '110101199001011234', '北京市朝阳区建国路88号'],
      ['李四', '13800138002', 'lisi@test.com', '310101199203022345', '上海市浦东新区陆家嘴路100号'],
      ['王五', '13800138003', 'wangwu@test.com', '440101198812033456', '广州市天河区天河路200号'],
      ['赵六', '13800138004', 'zhaoliu@test.com', '500101199505044567', '重庆市渝中区解放碑路50号'],
      ['钱七', '13800138005', 'qianqi@test.com', '330101199106055678', '杭州市西湖区文三路300号'],
    ];
    for (const [name, phone, email, idNumber, address] of customers) {
      await q('INSERT INTO customer (name, phone, email, id_number, address) VALUES (?, ?, ?, ?, ?)', [
        name,
        phone,
        email,
        idNumber,
        address,
      ]);
    }

    // 车辆
    const vehicles = [
      ['京A12345', '大众', '帕萨特', 2022, 'WVWZZZ3CZWE123456', 'ENG001', 1],
      ['沪B67890', '丰田', '凯美瑞', 2023, '4T1BF1FK5EU654321', 'ENG002', 2],
      ['粤C11111', '宝马', '3系', 2021, 'WBA8E9C50GU789012', 'ENG003', 3],
      ['渝D22222', '奔驰', 'C级', 2023, 'WDD2050351F234567', 'ENG004', 4],
      ['浙E33333', '奥迪', 'A4L', 2022, 'WAUAD38H0KA123456', 'ENG005', 5],
    ];
    for (const [plate, brand, model, year, vin, engine, customerId] of vehicles) {
      await q(
        'INSERT INTO vehicle (plate_number, brand, model, year, vin, engine_number, customer_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [plate, brand, model, year, vin, engine, customerId],
      );
    }

    // 交强 / 商业险种
    for (const name of ['交强险', '代收车船税']) {
      await q('INSERT INTO compulsory_insurance_type (name) VALUES (?)', [name]);
    }
    const commercialTypes: [string, number][] = [
      ['第三者责任险', 10], ['车辆损失险', 20], ['车上人员责任险（司机）', 30],
      ['车上人员责任险（乘客）', 40], ['医保外医疗费用责任险', 50], ['划痕险', 60],
      ['玻璃单独破碎险', 70], ['车身盗抢险', 80],
    ];
    for (const [name, sortOrder] of commercialTypes) {
      await q('INSERT INTO commercial_insurance_type (name, sort_order, status) VALUES (?, ?, ?)', [
        name,
        sortOrder,
        '启用',
      ]);
    }

    // 保险公司
    const companies: [string, string, string][] = [
      ['平安保险', '王经理', '13810000001'],
      ['太平洋保险', '李经理', '13810000002'],
      ['人保财险', '赵经理', '13810000003'],
    ];
    for (const [name, contact, phone] of companies) {
      await q('INSERT INTO insurance_company (name, contact_person, contact_phone) VALUES (?, ?, ?)', [
        name,
        contact,
        phone,
      ]);
    }

    // 保单
    const policies = [
      ['POL-2024-001', 1, 1, '综合', 5680.0, 200000.0, '2024-06-01', '2025-06-01', '生效'],
      ['POL-2024-002', 2, 2, '商业险', 4200.0, 150000.0, '2024-08-15', '2025-08-15', '生效'],
      ['POL-2025-003', 3, 3, '交强险', 950.0, 200000.0, '2025-01-10', '2026-01-10', '生效'],
      ['POL-2025-004', 1, 1, '交强险', 950.0, 200000.0, '2025-05-20', '2026-05-20', '待生效'],
      ['POL-2024-005', 4, 4, '综合', 7200.0, 250000.0, '2024-03-01', '2025-03-01', '已过期'],
      ['POL-2025-006', 5, 5, '商业险', 4800.0, 180000.0, '2025-04-01', '2026-04-01', '生效'],
    ];
    for (const [num, cid, vid, type, premium, sumInsured, start, end, status] of policies) {
      await q(
        'INSERT INTO policy (policy_number, customer_id, vehicle_id, insurance_type, premium, sum_insured, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [num, cid, vid, type, premium, sumInsured, start, end, status],
      );
    }

    // 续保记录
    const renewals = [
      [1, '2025-05-01', '已提醒', '张三的帕萨特综合险即将到期'],
      [2, '2025-07-15', '待提醒', '李四的凯美瑞商业险即将到期'],
      [5, '2025-02-01', '已过期', '赵六的奔驰C级综合险已过期'],
    ];
    for (const [oldPolicyId, remindDate, status, note] of renewals) {
      await q('INSERT INTO renewal_record (old_policy_id, remind_date, status, note) VALUES (?, ?, ?, ?)', [
        oldPolicyId,
        remindDate,
        status,
        note,
      ]);
    }

    // 操作日志
    const logs = [
      ['admin', '新增用户', 'zhangsan', '创建普通员工账号', '成功', '2026-04-28 09:00:01'],
      ['admin', '新增用户', 'lisi', '创建普通员工账号', '成功', '2026-04-28 09:05:02'],
      ['admin', '新增用户', 'wangwu', '创建管理员账号', '成功', '2026-04-28 09:10:03'],
      ['zhangsan', '新增客户', '张三', '', '成功', '2026-04-28 10:00:01'],
      ['zhangsan', '新增客户', '李四', '', '成功', '2026-04-28 10:05:02'],
      ['lisi', '新增客户', '王五', '', '成功', '2026-04-28 10:10:03'],
      ['zhangsan', '新增保单', 'POL-2024-001', '张三 京A12345 综合险', '成功', '2026-04-28 11:00:01'],
      ['lisi', '新增保单', 'POL-2024-002', '李四 沪B67890 商业险', '成功', '2026-04-28 11:05:02'],
      ['wangwu', '编辑用户', 'zhaoliu', '状态: 启用 → 禁用', '成功', '2026-04-28 14:00:01'],
      ['admin', '新增用户', 'zhaoliu', '创建普通员工账号', '成功', '2026-04-28 14:30:01'],
    ];
    for (const [operator, action, target, detail, result, createdAt] of logs) {
      await q(
        'INSERT INTO operation_log (operator, action, target, detail, result, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [operator, action, target, detail, result, createdAt],
      );
    }

    console.log('Seed completed:');
    console.log(
      '  5 users (admin/123456), 5 customers, 5 vehicles, 2 交强 + 8 商业险种, 3 保险公司, 6 policies, 3 renewals, 10 logs',
    );
  } finally {
    await appCtx.close();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
