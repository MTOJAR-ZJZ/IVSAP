import { Router } from 'express';
import { query } from '../db/pool.js';
import { authMiddleware } from '../middleware/auth.js';
import { resolveStream } from '../utils/resolver.js';

const router = Router();

// POST /api/streams/resolve — 解析源地址（免认证，工具接口）
router.post('/resolve', async (req, res) => {
  const { addr } = req.body;
  if (!addr) return res.status(400).json({ error: '请提供源地址 addr' });
  const mediaServerUrl = process.env.MEDIA_SERVER_URL || '';
  const result = resolveStream(addr, mediaServerUrl);
  res.json(result);
});

router.use(authMiddleware);

router.get('/', async (req, res) => {
  const result = await query('SELECT * FROM streams ORDER BY created_at DESC');
  res.json(result.rows);
});

router.post('/', async (req, res) => {
  const { name, addr, play_url, protocol, res: resolution, fps, capture_interval, codec } = req.body;
  if (!name || !addr) return res.status(400).json({ error: '流名称和推流地址为必填' });
  const id = 'S' + String((await query("SELECT count(*) FROM streams")).rows[0].count + 1).padStart(3,'0');
  const r = await query(
    'INSERT INTO streams (id, name, addr, play_url, protocol, res, fps, capture_interval, codec) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
    [id, name, addr, play_url || '', protocol || 'RTSP', resolution || '1080P', fps || 25, capture_interval || 5, codec || 'H.264']
  );
  res.status(201).json(r.rows[0]);
});

router.put('/:id', async (req, res) => {
  const { name, addr, play_url, protocol, res: resolution, fps, capture_interval, codec, status } = req.body;
  const r = await query(
    `UPDATE streams SET name=$1, addr=$2, play_url=$3, protocol=$4, res=$5, fps=$6, capture_interval=$7, codec=$8, status=$9 WHERE id=$10 RETURNING *`,
    [name, addr, play_url || '', protocol, resolution, fps, capture_interval, codec, status, req.params.id]
  );
  if (r.rows.length === 0) return res.status(404).json({ error: '流不存在' });
  res.json(r.rows[0]);
});

router.delete('/:id', async (req, res) => {
  const r = await query('DELETE FROM streams WHERE id=$1 RETURNING *', [req.params.id]);
  if (r.rows.length === 0) return res.status(404).json({ error: '流不存在' });
  res.json({ message: '已删除' });
});

router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!['online','offline','error'].includes(status)) return res.status(400).json({ error: '无效状态' });
  const r = await query('UPDATE streams SET status=$1 WHERE id=$2 RETURNING *', [status, req.params.id]);
  res.json(r.rows[0]);
});

export default router;
