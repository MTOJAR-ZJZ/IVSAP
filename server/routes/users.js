import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const result = await query('SELECT id, name, account, role, dept, phone, email, status FROM users ORDER BY created_at');
  res.json(result.rows);
});

router.post('/', async (req, res) => {
  const { name, phone, dept, role, email } = req.body;
  if (!name || !phone) return res.status(400).json({ error: '姓名和手机号为必填' });
  const count = (await query("SELECT count(*) FROM users")).rows[0].count;
  const id = 'U' + String(parseInt(count) + 1).padStart(3,'0');
  const hp = await bcrypt.hash(phone, 10);
  const r = await query(
    'INSERT INTO users (id, name, account, password, phone, dept, role, email) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, name, account, role, dept, phone, email, status',
    [id, name, phone, hp, phone, dept || '', role || '值班工程师', email || '']
  );
  res.status(201).json(r.rows[0]);
});

router.put('/:id', async (req, res) => {
  const { name, phone, dept, role, email } = req.body;
  if (!phone) return res.status(400).json({ error: '手机号为必填' });
  const r = await query(
    'UPDATE users SET name=$1, account=$2, phone=$2, dept=$3, role=$4, email=$5 WHERE id=$6 RETURNING id, name, account, role, dept, phone, email, status',
    [name, phone, dept, role, email, req.params.id]
  );
  if (r.rows.length === 0) return res.status(404).json({ error: '用户不存在' });
  res.json(r.rows[0]);
});

router.patch('/:id/toggle', async (req, res) => {
  const u = await query('SELECT status FROM users WHERE id=$1', [req.params.id]);
  if (u.rows.length === 0) return res.status(404).json({ error: '用户不存在' });
  const newStatus = u.rows[0].status === 'active' ? 'disabled' : 'active';
  const r = await query('UPDATE users SET status=$1 WHERE id=$2 RETURNING id, name, account, role, dept, phone, email, status', [newStatus, req.params.id]);
  res.json(r.rows[0]);
});

export default router;
