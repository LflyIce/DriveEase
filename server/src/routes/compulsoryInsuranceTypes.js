import { Router } from 'express';
import { all, get, run, log } from '../database.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const { page = 1, pageSize = 10, keyword } = req.query;
    const params = [];
    const where = keyword ? 'WHERE name LIKE ?' : '';
    if (keyword) params.push(`%${keyword}%`);
    const total = get(`SELECT COUNT(*) as count FROM compulsory_insurance_type ${where}`, params)?.count || 0;
    const data = all(
      `SELECT * FROM compulsory_insurance_type ${where} ORDER BY is_common DESC, id DESC LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), (Number(page) - 1) * Number(pageSize)]
    );
    res.json({ data, total, page: Number(page), pageSize: Number(pageSize) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { name, is_common } = req.body;
    const existing = get('SELECT id FROM compulsory_insurance_type WHERE name = ?', [name]);
    if (existing) return res.status(400).json({ error: '交强险名称已存在' });
    const result = run('INSERT INTO compulsory_insurance_type (name, is_common) VALUES (?, ?)', [name, is_common ? 1 : 0]);
    log({ operator: '管理员', action: '新增交强险', target: name });
    const row = get('SELECT * FROM compulsory_insurance_type WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(row);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const existing = get('SELECT * FROM compulsory_insurance_type WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: '交强险名称不存在' });
    const { name, is_common } = req.body;
    const nextIsCommon = Object.prototype.hasOwnProperty.call(req.body, 'is_common') ? (is_common ? 1 : 0) : existing.is_common || 0;
    run('UPDATE compulsory_insurance_type SET name=?, is_common=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [
      name,
      nextIsCommon,
      req.params.id,
    ]);
    log({ operator: '管理员', action: '编辑交强险', target: name || existing.name });
    const row = get('SELECT * FROM compulsory_insurance_type WHERE id = ?', [req.params.id]);
    res.json(row);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const existing = get('SELECT * FROM compulsory_insurance_type WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: '交强险名称不存在' });
    run('DELETE FROM compulsory_insurance_type WHERE id = ?', [req.params.id]);
    log({ operator: '管理员', action: '删除交强险', target: existing.name });
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
