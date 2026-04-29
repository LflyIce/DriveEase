import { Router } from 'express';
import { all, get, run, log } from '../database.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const { page = 1, pageSize = 10, keyword } = req.query;
    let where = '';
    const params = [];
    if (keyword) {
      where = 'WHERE name LIKE ? OR phone LIKE ? OR id_number LIKE ?';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    const total = get(`SELECT COUNT(*) as count FROM customer ${where}`, params)?.count || 0;
    const data = all(
      `SELECT * FROM customer ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), (Number(page) - 1) * Number(pageSize)]
    );
    res.json({ data, total, page: Number(page), pageSize: Number(pageSize) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const customer = get('SELECT * FROM customer WHERE id = ?', [req.params.id]);
    if (!customer) return res.status(404).json({ error: '客户不存在' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { name, phone, email, id_number, address } = req.body;
    const result = run(
      'INSERT INTO customer (name, phone, email, id_number, address) VALUES (?, ?, ?, ?, ?)',
      [name, phone, email || null, id_number || null, address || null]
    );
    log({ operator: '管理员', action: '新增客户', target: name });
    const customer = get('SELECT * FROM customer WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(customer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const existing = get('SELECT * FROM customer WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: '客户不存在' });
    const { name, phone, email, id_number, address } = req.body;
    run(
      'UPDATE customer SET name=?, phone=?, email=?, id_number=?, address=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
      [name, phone, email || null, id_number || null, address || null, req.params.id]
    );
    log({ operator: '管理员', action: '编辑客户', target: name });
    const updated = get('SELECT * FROM customer WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const existing = get('SELECT * FROM customer WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: '客户不存在' });
    run('DELETE FROM customer WHERE id = ?', [req.params.id]);
    log({ operator: '管理员', action: '删除客户', target: existing.name });
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
