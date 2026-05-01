import { Router } from 'express';
import { all, get, run, log } from '../database.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const { page = 1, pageSize = 10, keyword, status } = req.query;
    const conditions = [];
    const params = [];
    if (keyword) {
      conditions.push('name LIKE ?');
      params.push(`%${keyword}%`);
    }
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const total = get(`SELECT COUNT(*) as count FROM commercial_insurance_type ${where}`, params)?.count || 0;
    const data = all(
      `SELECT * FROM commercial_insurance_type ${where} ORDER BY is_common DESC, sort_order ASC, id ASC LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), (Number(page) - 1) * Number(pageSize)]
    );
    res.json({ data, total, page: Number(page), pageSize: Number(pageSize) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { name, status, sort_order, remark, is_common } = req.body;
    const existing = get('SELECT id FROM commercial_insurance_type WHERE name = ?', [name]);
    if (existing) return res.status(400).json({ error: '商业险种已存在' });
    const result = run(
      'INSERT INTO commercial_insurance_type (name, status, is_common, sort_order, remark) VALUES (?, ?, ?, ?, ?)',
      [name, status || '启用', is_common ? 1 : 0, sort_order || 0, remark || null]
    );
    log({ operator: '管理员', action: '新增商业险种', target: name });
    const row = get('SELECT * FROM commercial_insurance_type WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(row);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const existing = get('SELECT * FROM commercial_insurance_type WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: '商业险种不存在' });
    const { name, status, sort_order, remark, is_common } = req.body;
    const nextIsCommon = Object.prototype.hasOwnProperty.call(req.body, 'is_common') ? (is_common ? 1 : 0) : existing.is_common || 0;
    run(
      'UPDATE commercial_insurance_type SET name=?, status=?, is_common=?, sort_order=?, remark=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
      [
        name,
        status || existing.status,
        nextIsCommon,
        sort_order ?? existing.sort_order ?? 0,
        remark ?? existing.remark ?? null,
        req.params.id,
      ]
    );
    log({ operator: '管理员', action: '编辑商业险种', target: name || existing.name });
    const row = get('SELECT * FROM commercial_insurance_type WHERE id = ?', [req.params.id]);
    res.json(row);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const existing = get('SELECT * FROM commercial_insurance_type WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: '商业险种不存在' });
    run('DELETE FROM commercial_insurance_type WHERE id = ?', [req.params.id]);
    log({ operator: '管理员', action: '删除商业险种', target: existing.name });
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
