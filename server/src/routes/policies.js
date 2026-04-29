import { Router } from 'express';
import { all, get, run, log } from '../database.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const { page = 1, pageSize = 10, keyword, status } = req.query;
    const conditions = [];
    const params = [];
    if (keyword) {
      conditions.push('p.policy_number LIKE ?');
      params.push(`%${keyword}%`);
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

export default router;
