import { Router } from 'express';
import { query } from '../db/pool.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const result = await query('SELECT * FROM algo_types ORDER BY id');
  res.json(result.rows);
});

router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: '算法名称为必填' });
  const exists = await query('SELECT 1 FROM algo_types WHERE name=$1', [name]);
  if (exists.rows.length > 0) return res.status(409).json({ error: '该算法已存在' });
  const r = await query('INSERT INTO algo_types (name) VALUES ($1) RETURNING *', [name]);
  res.status(201).json(r.rows[0]);
});

router.put('/:id', async (req, res) => {
  const { name, prompt } = req.body;
  const r = await query('UPDATE algo_types SET name=$1, prompt=$2 WHERE id=$3 RETURNING *',
    [name, prompt || '', req.params.id]);
  if (r.rows.length === 0) return res.status(404).json({ error: '算法不存在' });
  res.json(r.rows[0]);
});

router.delete('/:id', async (req, res) => {
  // Check if in use
  const algo = await query('SELECT name FROM algo_types WHERE id=$1', [req.params.id]);
  if (algo.rows.length === 0) return res.status(404).json({ error: '算法不存在' });
  await query("UPDATE detections SET algo='未配置' WHERE algo=$1", [algo.rows[0].name]);
  await query('DELETE FROM algo_types WHERE id=$1', [req.params.id]);
  res.json({ message: '已移除' });
});

export default router;
