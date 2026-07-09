import { Router } from 'express';
import { all, get, run, log } from '../database.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const { page = 1, pageSize = 10, keyword, status } = req.query;
    const conditions = [];
    const params = [];
    if (keyword) {
      // 按客户统计：keyword 同时匹配保单号 / 客户名 / 客户电话 / 车牌号
      // （列表 SQL 已 LEFT JOIN customer c / vehicle v）
      conditions.push(
        '(p.policy_number LIKE ? OR c.name LIKE ? OR c.phone LIKE ? OR v.plate_number LIKE ?)'
      );
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw, kw);
    }
    if (status) {
      conditions.push('p.status = ?');
      params.push(status);
    }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const total = get(`SELECT COUNT(*) as count FROM policy p ${where}`, params)?.count || 0;
    const data = all(
      `SELECT p.*, c.name as customer_name, c.phone as customer_phone,
              v.plate_number, v.brand as vehicle_brand, v.model as vehicle_model
       FROM policy p
       LEFT JOIN customer c ON p.customer_id = c.id
       LEFT JOIN vehicle v ON p.vehicle_id = v.id
       ${where} ORDER BY p.id DESC LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), (Number(page) - 1) * Number(pageSize)]
    );
    const formatted = data.map((row) => ({
      ...row,
      customer: row.customer_name ? { id: row.customer_id, name: row.customer_name, phone: row.customer_phone } : null,
      vehicle: row.plate_number ? { id: row.vehicle_id, plate_number: row.plate_number, brand: row.vehicle_brand, model: row.vehicle_model } : null,
    }));
    res.json({ data: formatted, total, page: Number(page), pageSize: Number(pageSize) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const row = get(
      `SELECT p.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email, c.id_number,
              v.plate_number, v.brand as vehicle_brand, v.model as vehicle_model, v.year as vehicle_year, v.vin
       FROM policy p
       LEFT JOIN customer c ON p.customer_id = c.id
       LEFT JOIN vehicle v ON p.vehicle_id = v.id
       WHERE p.id = ?`,
      [req.params.id]
    );
    if (!row) return res.status(404).json({ error: '保单不存在' });
    const { customer_name, customer_phone, customer_email, id_number, plate_number, vehicle_brand, vehicle_model, vehicle_year, vin, ...policy } = row;
    res.json({
      ...policy,
      customer: customer_name ? { name: customer_name, phone: customer_phone, email: customer_email, id_number } : null,
      vehicle: plate_number ? { plate_number, brand: vehicle_brand, model: vehicle_model, year: vehicle_year, vin } : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const {
      policy_number,
      customer_id,
      vehicle_id,
      insurance_type,
      premium,
      sum_insured,
      issue_time,
      policy_date,
      effective_date,
      expiry_date,
      start_date,
      end_date,
      certificate_type,
      certificate_number,
      insurance_company,
      contact_person,
      contact_phone,
      sales_person,
      compulsory_detail,
      commercial_detail,
      remark,
    } = req.body;
    const resolvedStartDate = effective_date || start_date;
    const resolvedEndDate = expiry_date || end_date;
    const result = run(
      `INSERT INTO policy (
        policy_number, customer_id, vehicle_id, insurance_type, premium, sum_insured,
        issue_time, policy_date, effective_date, expiry_date, start_date, end_date,
        certificate_type, certificate_number, insurance_company, contact_person, contact_phone, sales_person,
        compulsory_detail, commercial_detail, remark
      )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        policy_number,
        customer_id,
        vehicle_id,
        insurance_type,
        premium,
        sum_insured,
        issue_time || null,
        policy_date || null,
        resolvedStartDate,
        resolvedEndDate,
        resolvedStartDate,
        resolvedEndDate,
        certificate_type || null,
        certificate_number || null,
        insurance_company || null,
        contact_person || null,
        contact_phone || null,
        sales_person || null,
        compulsory_detail ? JSON.stringify(compulsory_detail) : null,
        commercial_detail ? JSON.stringify(commercial_detail) : null,
        remark || null,
      ]
    );
    const policy = get('SELECT * FROM policy WHERE id = ?', [result.lastInsertRowid]);
    log({ operator: '管理员', action: '新增保单', target: policy_number });
    res.status(201).json(policy);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const existing = get('SELECT * FROM policy WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: '保单不存在' });
    const {
      policy_number,
      customer_id,
      vehicle_id,
      insurance_type,
      premium,
      sum_insured,
      issue_time,
      policy_date,
      effective_date,
      expiry_date,
      start_date,
      end_date,
      status,
      certificate_type,
      certificate_number,
      insurance_company,
      contact_person,
      contact_phone,
      sales_person,
      compulsory_detail,
      commercial_detail,
      remark,
    } = req.body;
    const resolvedStartDate = effective_date || start_date;
    const resolvedEndDate = expiry_date || end_date;
    run(
      `UPDATE policy SET policy_number=?, customer_id=?, vehicle_id=?, insurance_type=?, premium=?, sum_insured=?,
       issue_time=?, policy_date=?, effective_date=?, expiry_date=?, start_date=?, end_date=?,
       certificate_type=?, certificate_number=?, insurance_company=?, contact_person=?, contact_phone=?, sales_person=?,
       compulsory_detail=?, commercial_detail=?, status=?, remark=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      [
        policy_number || existing.policy_number,
        customer_id,
        vehicle_id,
        insurance_type,
        premium,
        sum_insured,
        issue_time || existing.issue_time || null,
        policy_date || existing.policy_date || null,
        resolvedStartDate,
        resolvedEndDate,
        resolvedStartDate,
        resolvedEndDate,
        certificate_type || null,
        certificate_number || null,
        insurance_company || null,
        contact_person || null,
        contact_phone || null,
        sales_person || null,
        compulsory_detail ? JSON.stringify(compulsory_detail) : null,
        commercial_detail ? JSON.stringify(commercial_detail) : null,
        status || existing.status,
        remark || null,
        req.params.id,
      ]
    );
    const updated = get('SELECT * FROM policy WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/:id/status', (req, res) => {
  try {
    const existing = get('SELECT * FROM policy WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: '保单不存在' });
    run('UPDATE policy SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [req.body.status, req.params.id]);
    log({ operator: '管理员', action: '变更保单状态', target: existing.policy_number, detail: `${existing.status} → ${req.body.status}` });
    const updated = get('SELECT * FROM policy WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const existing = get('SELECT * FROM policy WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: '保单不存在' });
    run('DELETE FROM policy WHERE id = ?', [req.params.id]);
    log({ operator: '管理员', action: '删除保单', target: existing.policy_number });
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 录入页聚合接口：一次性 upsert 客户(按手机号) + 车辆(按车牌) + 新建保单
router.post('/full', (req, res) => {
  try {
    const b = req.body || {};
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    // 1. upsert customer（按 phone 复用，避免重复客户）
    let customerId;
    if (b.phone) {
      const exist = get('SELECT id FROM customer WHERE phone = ?', [b.phone]);
      if (exist) {
        run(
          `UPDATE customer SET name=?, id_number=?, birthday=?, customer_type=?, business_attribution=?, business_area=?, address=?, follow_status=?, ssn_front=?, business_license=?, ssn_back=?, id_authority=?, id_valid_date=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
          [
            b.name,
            b.id_number ?? null,
            b.birthday ?? null,
            b.customer_type ?? null,
            b.business_attribution ?? null,
            b.business_area ?? null,
            b.address ?? null,
            b.follow_status ? JSON.stringify(b.follow_status) : null,
            b.ssn_front ?? null,
            b.business_license ?? null,
            b.ssn_back ?? null,
            b.id_authority ?? null,
            b.id_valid_date ?? null,
            exist.id,
          ],
        );
        customerId = exist.id;
      }
    }
    if (!customerId) {
      const r = run(
        `INSERT INTO customer (name, phone, id_number, birthday, customer_type, business_attribution, business_area, address, follow_status, ssn_front, business_license, ssn_back, id_authority, id_valid_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          b.name,
          b.phone,
          b.id_number ?? null,
          b.birthday ?? null,
          b.customer_type ?? null,
          b.business_attribution ?? null,
          b.business_area ?? null,
          b.address ?? null,
          b.follow_status ? JSON.stringify(b.follow_status) : null,
          b.ssn_front ?? null,
          b.business_license ?? null,
          b.ssn_back ?? null,
          b.id_authority ?? null,
          b.id_valid_date ?? null,
        ],
      );
      customerId = r.lastInsertRowid;
    }

    // 2. upsert vehicle（按 plate_number 复用；旧 brand/model 字段用 brand_model 兜底）
    let vehicleId;
    const brandModel = b.brand_model ?? '';
    if (b.plate_number) {
      const exist = get('SELECT id FROM vehicle WHERE plate_number = ?', [
        b.plate_number,
      ]);
      if (exist) {
        run(
          `UPDATE vehicle SET brand=?, model=?, vin=?, engine_number=?, brand_model=?, energy_type=?, vehicle_type=?, register_date=?, certificate_date=?, next_inspection_date=?, transfer_flag=?, seats=?, load_capacity=?, driving_front=?, driving_back=?, customer_id=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
          [
            brandModel,
            brandModel,
            b.vin ?? null,
            b.engine_number ?? null,
            brandModel,
            b.energy_type ?? null,
            b.vehicle_type ?? null,
            b.register_date ?? null,
            b.certificate_date ?? null,
            b.next_inspection_date ?? null,
            b.transfer_flag ?? null,
            b.seats ?? null,
            b.load_capacity ?? null,
            b.driving_front ?? null,
            b.driving_back ?? null,
            customerId,
            exist.id,
          ],
        );
        vehicleId = exist.id;
      }
    }
    if (!vehicleId) {
      if (!b.plate_number) return res.status(400).json({ error: '车牌号为必填' });
      const r = run(
        `INSERT INTO vehicle (plate_number, brand, model, vin, engine_number, customer_id, brand_model, energy_type, vehicle_type, register_date, certificate_date, next_inspection_date, transfer_flag, seats, load_capacity, driving_front, driving_back) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          b.plate_number,
          brandModel,
          brandModel,
          b.vin ?? null,
          b.engine_number ?? null,
          customerId,
          brandModel,
          b.energy_type ?? null,
          b.vehicle_type ?? null,
          b.register_date ?? null,
          b.certificate_date ?? null,
          b.next_inspection_date ?? null,
          b.transfer_flag ?? null,
          b.seats ?? null,
          b.load_capacity ?? null,
          b.driving_front ?? null,
          b.driving_back ?? null,
        ],
      );
      vehicleId = r.lastInsertRowid;
    }

    // 3. 新建保单（policy_number 自动生成；推导 insurance_type；日期双写）
    const policyNumber = `POL-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const hasTraffic = Number(b.traffic_premium) > 0;
    const hasCommercial = Number(b.commercial_premium) > 0;
    const insuranceType =
      hasTraffic && hasCommercial
        ? '综合'
        : hasTraffic
          ? '交强险'
          : hasCommercial
            ? '商业险'
            : '综合';
    const premium = Number(b.premium) || 0;
    const sumInsured = Number(b.sum_insured) || premium;
    const policyDate = b.policy_date || today;
    const expiryDate =
      b.expiry_date ||
      `${now.getFullYear() + 1}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    const pr = run(
      `INSERT INTO policy (
        policy_number, customer_id, vehicle_id, insurance_type, premium, sum_insured,
        start_date, end_date, status, policy_date, effective_date, expiry_date,
        insurance_company, sales_person, remark,
        traffic_premium, travel_tax, commercial_premium, surcharge_premium, surcharge_premium2,
        commission, expenses, traffic_rate, traffic_charge, commercial_rate, commercial_charge,
        surcharge_rate, surcharge_charge, surcharge_rate2, surcharge_charge2, total_charge,
        quotation, policy_file
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        policyNumber,
        customerId,
        vehicleId,
        insuranceType,
        premium,
        sumInsured,
        policyDate,
        expiryDate,
        '待生效',
        policyDate,
        policyDate,
        expiryDate,
        b.insurance_company ?? null,
        b.sales_person ?? null,
        b.remark ?? null,
        b.traffic_premium ?? null,
        b.travel_tax ?? null,
        b.commercial_premium ?? null,
        b.surcharge_premium ?? null,
        b.surcharge_premium2 ?? null,
        b.commission ?? null,
        b.expenses ?? null,
        b.traffic_rate ?? null,
        b.traffic_charge ?? null,
        b.commercial_rate ?? null,
        b.commercial_charge ?? null,
        b.surcharge_rate ?? null,
        b.surcharge_charge ?? null,
        b.surcharge_rate2 ?? null,
        b.surcharge_charge2 ?? null,
        b.total_charge ?? null,
        b.quotation ?? null,
        b.policy_file ?? null,
      ],
    );

    log({ operator: '管理员', action: '新增保单', target: policyNumber });
    res.status(201).json({
      customer_id: customerId,
      vehicle_id: vehicleId,
      policy_id: pr.lastInsertRowid,
      policy_number: policyNumber,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
