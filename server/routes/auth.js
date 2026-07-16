import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db/pool.js';
import { config } from '../config.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { account, password } = req.body;
    if (!account || !password) return res.status(400).json({ error: '请输入账号和密码' });

    const result = await query('SELECT * FROM users WHERE account = $1 AND status = $2', [account, 'active']);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: '账号或密码错误' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: '账号或密码错误' });

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role, dept: user.dept },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.json({ token, user: { id: user.id, name: user.name, account: user.account, role: user.role, dept: user.dept } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: '登录失败' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await query('SELECT id, name, account, role, dept, phone, email, status FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

export default router;
