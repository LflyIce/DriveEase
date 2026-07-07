import { Router } from 'express';
import { all, get, run } from '../database.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const { page = 1, pageSize = 10, keyword, customer_id } = req.query;
    const conditions = [];
    const params = [];
    if (keyword) {
      conditions.push('(v.plate_number LIKE ? OR v.brand LIKE ? OR v.vin LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (customer_id) {
      conditions.push('v.customer_id = ?');
      params.push(customer_id);
    }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const total = get(`SELECT COUNT(*) as count FROM vehicle v ${where}`, params)?.count || 0;
    const data = all(
      `SELECT v.*, c.name as customer_name, c.phone as customer_phone
       FROM vehicle v LEFT JOIN customer c ON v.customer_id = c.id
       ${where} ORDER BY v.id DESC LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), (Number(page) - 1) * Number(pageSize)]
    );
    const formatted = data.map((row) => ({
      ...row,
      customer: row.customer_name ? { id: row.customer_id, name: row.customer_name, phone: row.customer_phone } : null,
    }));
    res.json({ data: formatted, total, page: Number(page), pageSize: Number(pageSize) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const row = get(
      `SELECT v.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email
       FROM vehicle v LEFT JOIN customer c ON v.customer_id = c.id WHERE v.id = ?`,
      [req.params.id]
    );
    if (!row) return res.status(404).json({ error: '车辆不存在' });
    const { customer_name, customer_phone, customer_email, ...vehicle } = row;
    res.json({ ...vehicle, customer: customer_name ? { name: customer_name, phone: customer_phone, email: customer_email } : null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { plate_number, brand, model, year, vin, engine_number, customer_id } = req.body;
    const result = run(
      'INSERT INTO vehicle (plate_number, brand, model, year, vin, engine_number, customer_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [plate_number, brand, model, year || null, vin || null, engine_number || null, customer_id]
    );
    const vehicle = get('SELECT * FROM vehicle WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(vehicle);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const existing = get('SELECT * FROM vehicle WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: '车辆不存在' });
    const { plate_number, brand, model, year, vin, engine_number, customer_id } = req.body;
    run(
      'UPDATE vehicle SET plate_number=?, brand=?, model=?, year=?, vin=?, engine_number=?, customer_id=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
      [plate_number, brand, model, year || null, vin || null, engine_number || null, customer_id, req.params.id]
    );
    const updated = get('SELECT * FROM vehicle WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const existing = get('SELECT * FROM vehicle WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: '车辆不存在' });
    run('DELETE FROM vehicle WHERE id = ?', [req.params.id]);
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
