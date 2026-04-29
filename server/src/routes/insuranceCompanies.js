import { Router } from 'express';
import { all, get, run, log } from '../database.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const { page = 1, pageSize = 10, keyword } = req.query;
    const params = [];
    const where = keyword ? 'WHERE name LIKE ? OR contact_person LIKE ? OR contact_phone LIKE ?' : '';
    if (keyword) {
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    const total = get(`SELECT COUNT(*) as count FROM insurance_company ${where}`, params)?.count || 0;
    const data = all(
      `SELECT * FROM insurance_company ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), (Number(page) - 1) * Number(pageSize)]
    );
    res.json({ data, total, page: Number(page), pageSize: Number(pageSize) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { name, contact_person, contact_phone } = req.body;
    const existing = get('SELECT id FROM insurance_company WHERE name = ?', [name]);
    if (existing) return res.status(400).json({ error: '保险公司已存在' });
    const result = run(
      'INSERT INTO insurance_company (name, contact_person, contact_phone) VALUES (?, ?, ?)',
      [name, contact_person || null, contact_phone || null]
    );
    log({ operator: '管理员', action: '新增保险公司', target: name });
    const row = get('SELECT * FROM insurance_company WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(row);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const existing = get('SELECT * FROM insurance_company WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: '保险公司不存在' });
    const { name, contact_person, contact_phone } = req.body;
    run(
      'UPDATE insurance_company SET name=?, contact_person=?, contact_phone=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
      [name, contact_person || null, contact_phone || null, req.params.id]
    );
    log({ operator: '管理员', action: '编辑保险公司', target: name || existing.name });
    const row = get('SELECT * FROM insurance_company WHERE id = ?', [req.params.id]);
    res.json(row);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const existing = get('SELECT * FROM insurance_company WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: '保险公司不存在' });
    run('DELETE FROM insurance_company WHERE id = ?', [req.params.id]);
    log({ operator: '管理员', action: '删除保险公司', target: existing.name });
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
