import { Router } from 'express';
import { query } from '../db/pool.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { type, status, limit = '50', offset = '0' } = req.query;
  let sql = `SELECT a.*, s.name AS stream_name FROM alerts a LEFT JOIN streams s ON a.stream_id = s.id WHERE 1=1`;
  const params = [];
  if (type) { params.push(type); sql += ` AND a.type = $${params.length}`; }
  if (status) { params.push(status); sql += ` AND a.status = $${params.length}`; }
  sql += ' ORDER BY a.created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(parseInt(limit), parseInt(offset));
  const result = await query(sql, params);
  res.json(result.rows);
});

router.patch('/:id/status', async (req, res) => {
  const { status, note } = req.body;
  if (!['pending','confirmed','ignored','false'].includes(status)) return res.status(400).json({ error: '无效状态' });
  const r = await query('UPDATE alerts SET status=$1, note=CASE WHEN $2::text IS NOT NULL AND $2::text!=\'\' THEN $2 ELSE note END WHERE id=$3 RETURNING *',
    [status, note || '', req.params.id]);
  if (r.rows.length === 0) return res.status(404).json({ error: '告警不存在' });
  res.json(r.rows[0]);
});

export default router;
