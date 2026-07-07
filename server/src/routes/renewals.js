import { Router } from 'express';
import { all, get, run } from '../database.js';
import dayjs from 'dayjs';

const router = Router();

function formatRenewal(row) {
  const {
    old_policy_id, policy_number, customer_name, customer_phone,
    plate_number, vehicle_brand, vehicle_model,
    new_policy_id, new_policy_number,
    ...renewal
  } = row;
  return {
    ...renewal,
    old_policy_id,
    oldPolicy: policy_number ? {
      id: old_policy_id,
      policy_number,
      customer: customer_name ? { name: customer_name, phone: customer_phone } : null,
      vehicle: plate_number ? { plate_number, brand: vehicle_brand, model: vehicle_model } : null,
    } : null,
    new_policy_id,
    newPolicy: new_policy_number ? { id: new_policy_id, policy_number: new_policy_number } : null,
  };
}

const baseQuery = `
  SELECT r.*,
    op.policy_number, op.customer_id,
    c.name as customer_name, c.phone as customer_phone,
    v.plate_number, v.brand as vehicle_brand, v.model as vehicle_model,
    np.policy_number as new_policy_number
  FROM renewal_record r
  LEFT JOIN policy op ON r.old_policy_id = op.id
  LEFT JOIN customer c ON op.customer_id = c.id
  LEFT JOIN vehicle v ON op.vehicle_id = v.id
  LEFT JOIN policy np ON r.new_policy_id = np.id
`;

router.get('/', (req, res) => {
  try {
    const { page = 1, pageSize = 10, status } = req.query;
    const conditions = [];
    const params = [];
    if (status) {
      conditions.push('r.status = ?');
      params.push(status);
    }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const total = get(`SELECT COUNT(*) as count FROM renewal_record r ${where}`, params)?.count || 0;
    const data = all(
      `${baseQuery} ${where} ORDER BY r.id DESC LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), (Number(page) - 1) * Number(pageSize)]
    );
    res.json({ data: data.map(formatRenewal), total, page: Number(page), pageSize: Number(pageSize) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/upcoming', (req, res) => {
  try {
    const today = dayjs().format('YYYY-MM-DD');
    const later = dayjs().add(30, 'day').format('YYYY-MM-DD');
    const data = all(
      `${baseQuery} WHERE r.status IN ('待提醒', '已提醒') AND r.remind_date BETWEEN ? AND ? ORDER BY r.remind_date ASC`,
      [today, later]
    );
    res.json(data.map(formatRenewal));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { old_policy_id, remind_date, note } = req.body;
    const result = run(
      'INSERT INTO renewal_record (old_policy_id, remind_date, note) VALUES (?, ?, ?)',
      [old_policy_id, remind_date, note || null]
    );
    const record = get('SELECT * FROM renewal_record WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/:id', (req, res) => {
  try {
    const existing = get('SELECT * FROM renewal_record WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: '续保记录不存在' });
    const { status, note } = req.body;
    run(
      'UPDATE renewal_record SET status = COALESCE(?, status), note = COALESCE(?, note) WHERE id = ?',
      [status || null, note || null, req.params.id]
    );
    const updated = get('SELECT * FROM renewal_record WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/renew', (req, res) => {
  try {
    const record = get('SELECT * FROM renewal_record WHERE id = ?', [req.params.id]);
    if (!record) return res.status(404).json({ error: '续保记录不存在' });
    const oldPolicy = get(
      `SELECT p.*, c.name as customer_name, v.plate_number
       FROM policy p LEFT JOIN customer c ON p.customer_id = c.id
       LEFT JOIN vehicle v ON p.vehicle_id = v.id WHERE p.id = ?`,
      [record.old_policy_id]
    );
    if (!oldPolicy) return res.status(404).json({ error: '原保单不存在' });

    const newPolicyNumber = req.body.policy_number || `RNW-${Date.now()}`;
    const startDate = req.body.start_date || dayjs(oldPolicy.end_date).add(1, 'day').format('YYYY-MM-DD');
    const endDate = req.body.end_date || dayjs(oldPolicy.end_date).add(1, 'year').format('YYYY-MM-DD');

    const policyResult = run(
      `INSERT INTO policy (policy_number, customer_id, vehicle_id, insurance_type, premium, sum_insured, start_date, end_date, status, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, '待生效', ?)`,
      [
        newPolicyNumber,
        oldPolicy.customer_id,
        oldPolicy.vehicle_id,
        req.body.insurance_type || oldPolicy.insurance_type,
        req.body.premium || oldPolicy.premium,
        req.body.sum_insured || oldPolicy.sum_insured,
        startDate,
        endDate,
        req.body.remark || `续保自保单 ${oldPolicy.policy_number}`,
      ]
    );

    run('UPDATE renewal_record SET new_policy_id = ?, status = ? WHERE id = ?', [
      policyResult.lastInsertRowid,
      '已续保',
      req.params.id,
    ]);

    const newRecord = get('SELECT * FROM renewal_record WHERE id = ?', [req.params.id]);
    const newPolicy = get('SELECT * FROM policy WHERE id = ?', [policyResult.lastInsertRowid]);
    res.json({ renewalRecord: newRecord, newPolicy });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
