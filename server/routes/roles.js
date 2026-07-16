import { Router } from 'express';
import { query } from '../db/pool.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const result = await query('SELECT * FROM roles ORDER BY preset DESC, id');
  res.json(result.rows);
});

router.post('/', async (req, res) => {
  const { name, perms } = req.body;
  if (!name) return res.status(400).json({ error: '角色名称为必填' });
  const count = (await query("SELECT count(*) FROM roles")).rows[0].count;
  const id = 'R' + String(parseInt(count) + 1).padStart(3,'0');
  const r = await query('INSERT INTO roles (id, name, preset, perms) VALUES ($1,$2,false,$3) RETURNING *',
    [id, name, perms && perms.length > 0 ? perms : ['none']]);
  res.status(201).json(r.rows[0]);
});

router.put('/:id', async (req, res) => {
  const { name, perms } = req.body;
  const r = await query('UPDATE roles SET name=$1, perms=$2, preset=false WHERE id=$3 RETURNING *',
    [name, perms && perms.length > 0 ? perms : ['none'], req.params.id]);
  if (r.rows.length === 0) return res.status(404).json({ error: '角色不存在' });
  res.json(r.rows[0]);
});

export default router;
