import { Router } from 'express';
import { all, get } from '../database.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const { page = 1, pageSize = 10, operator, action } = req.query;
    const conditions = [];
    const params = [];
    if (operator) {
      conditions.push('operator LIKE ?');
      params.push(`%${operator}%`);
    }
    if (action) {
      conditions.push('action LIKE ?');
      params.push(`%${action}%`);
    }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const total = get(`SELECT COUNT(*) as count FROM operation_log ${where}`, params)?.count || 0;
    const data = all(
      `SELECT * FROM operation_log ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), (Number(page) - 1) * Number(pageSize)]
    );
    res.json({ data, total, page: Number(page), pageSize: Number(pageSize) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
