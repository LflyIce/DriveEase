import { Router } from 'express';
import { all, get, run, log } from '../database.js';
import crypto from 'crypto';

const router = Router();

function hashPassword(pwd) {
  return crypto.createHash('sha256').update(pwd).digest('hex');
}

router.get('/', (req, res) => {
  try {
    const { page = 1, pageSize = 10, keyword, role, status } = req.query;
    const conditions = [];
    const params = [];
    if (keyword) {
      conditions.push('(username LIKE ? OR email LIKE ? OR phone LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (role) {
      conditions.push('role = ?');
      params.push(role);
    }
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const total = get(`SELECT COUNT(*) as count FROM user ${where}`, params)?.count || 0;
    const data = all(
      `SELECT id, username, email, phone, role, status, created_at, updated_at FROM user ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), (Number(page) - 1) * Number(pageSize)]
    );
    res.json({ data, total, page: Number(page), pageSize: Number(pageSize) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const user = get('SELECT id, username, email, phone, role, status, created_at, updated_at FROM user WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { username, password, email, phone, role, status } = req.body;
    const existing = get('SELECT id FROM user WHERE username = ?', [username]);
    if (existing) return res.status(400).json({ error: '用户名已存在' });
    const result = run(
      'INSERT INTO user (username, password, email, phone, role, status) VALUES (?, ?, ?, ?, ?, ?)',
      [username, hashPassword(password || '123456'), email || null, phone || null, role || '普通员工', status || '启用']
    );
    log({ operator: '管理员', action: '新增用户', target: username });
    const user = get('SELECT id, username, email, phone, role, status, created_at, updated_at FROM user WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const existing = get('SELECT * FROM user WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: '用户不存在' });
    const { email, phone, role, status } = req.body;
    const newPassword = req.body.password ? hashPassword(req.body.password) : existing.password;
    run(
      'UPDATE user SET email=?, phone=?, role=?, status=?, password=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
      [email || null, phone || null, role || existing.role, status || existing.status, newPassword, req.params.id]
    );
    log({ operator: '管理员', action: '编辑用户', target: existing.username });
    const updated = get('SELECT id, username, email, phone, role, status, created_at, updated_at FROM user WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const existing = get('SELECT * FROM user WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: '用户不存在' });
    run('DELETE FROM user WHERE id = ?', [req.params.id]);
    log({ operator: '管理员', action: '删除用户', target: existing.username });
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    const user = get('SELECT id, username, email, phone, role, status FROM user WHERE username = ? AND password = ?', [username, hashPassword(password)]);
    if (!user) return res.status(401).json({ error: '用户名或密码错误' });
    if (user.status === '禁用') return res.status(403).json({ error: '账户已禁用' });
    log({ operator: username, action: '用户登录', target: username });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
