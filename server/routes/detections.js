import { Router } from 'express';
import { query } from '../db/pool.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const result = await query(`
    SELECT d.*, s.name AS stream_name FROM detections d
    LEFT JOIN streams s ON d.stream_id = s.id
    ORDER BY d.created_at DESC
  `);
  res.json(result.rows);
});

router.post('/', async (req, res) => {
  const { name, stream_id, algo, roi, sensitivity, data_type } = req.body;
  if (!name || !stream_id) return res.status(400).json({ error: '项目名称和关联流为必填' });
  const id = 'D' + String((await query("SELECT count(*) FROM detections")).rows[0].count + 1).padStart(3,'0');
  const r = await query(
    'INSERT INTO detections (id, name, stream_id, algo, roi, sensitivity, data_type) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
    [id, name, stream_id, algo || '人员入侵', roi || '', sensitivity || 0.65, data_type || '实时视频流']
  );
  res.status(201).json(r.rows[0]);
});

router.put('/:id', async (req, res) => {
  const { name, stream_id, algo, roi, sensitivity, data_type } = req.body;
  const r = await query(
    'UPDATE detections SET name=$1, stream_id=$2, algo=$3, roi=$4, sensitivity=$5, data_type=$6 WHERE id=$7 RETURNING *',
    [name, stream_id || null, algo, roi, sensitivity, data_type || '实时视频流', req.params.id]
  );
  if (r.rows.length === 0) return res.status(404).json({ error: '检测项目不存在' });
  res.json(r.rows[0]);
});

router.patch('/:id/toggle', async (req, res) => {
  const d = await query('SELECT status FROM detections WHERE id=$1', [req.params.id]);
  if (d.rows.length === 0) return res.status(404).json({ error: '检测项目不存在' });
  const newStatus = d.rows[0].status === 'running' ? 'stopped' : 'running';
  const r = await query('UPDATE detections SET status=$1 WHERE id=$2 RETURNING *', [newStatus, req.params.id]);
  res.json(r.rows[0]);
});

export default router;
