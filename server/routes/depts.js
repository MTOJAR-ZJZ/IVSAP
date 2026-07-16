import { Router } from 'express';
import { query } from '../db/pool.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  // Return flat list; frontend builds tree
  const result = await query('SELECT * FROM depts ORDER BY id');
  res.json(result.rows);
});

router.post('/', async (req, res) => {
  const { name, parent_id } = req.body;
  if (!name) return res.status(400).json({ error: '部门名称为必填' });
  const id = 'DEPT' + Date.now();
  const r = await query('INSERT INTO depts (id, name, parent_id) VALUES ($1,$2,$3) RETURNING *',
    [id, name, parent_id || null]);
  res.status(201).json(r.rows[0]);
});

export default router;
