import { Router } from 'express';
import { query } from '../db/pool.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const result = await query('SELECT * FROM tickets ORDER BY created_at DESC');
  res.json(result.rows);
});

router.post('/', async (req, res) => {
  const { title, priority, desc_text, alert_ids } = req.body;
  if (!title) return res.status(400).json({ error: '工单标题为必填' });
  const today = new Date().toISOString().slice(0,10).replace(/-/g,'');
  const count = (await query("SELECT count(*) FROM tickets")).rows[0].count;
  const id = `WO-${today}-${String(parseInt(count) + 1).padStart(5,'0')}`;
  const r = await query(
    'INSERT INTO tickets (id, title, priority, desc_text) VALUES ($1,$2,$3,$4) RETURNING *',
    [id, title, priority || 'mid', desc_text || '']
  );
  // Link alerts
  if (alert_ids && Array.isArray(alert_ids) && alert_ids.length > 0) {
    for (const aid of alert_ids) {
      await query('INSERT INTO ticket_alerts (ticket_id, alert_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [id, aid]);
      await query("UPDATE alerts SET status='confirmed', note=CONCAT(note,' 合并为工单 ', $1) WHERE id=$2", [id, aid]);
    }
  }
  res.status(201).json(r.rows[0]);
});

router.put('/:id/assign', async (req, res) => {
  const { assignee } = req.body;
  const r = await query("UPDATE tickets SET assignee=$1, status='processing', sla='剩余 29min' WHERE id=$2 RETURNING *",
    [assignee, req.params.id]);
  if (r.rows.length === 0) return res.status(404).json({ error: '工单不存在' });
  res.json(r.rows[0]);
});

router.put('/:id/status', async (req, res) => {
  const { status, desc_text } = req.body;
  const valid = ['pending_assign','processing','review','closed'];
  if (!valid.includes(status)) return res.status(400).json({ error: '无效状态' });
  const sla = status === 'closed' ? '已完成' : status === 'review' ? '待验收' : undefined;
  const r = await query(
    'UPDATE tickets SET status=$1, desc_text=CASE WHEN $2::text IS NOT NULL AND $2::text!=\'\' THEN $2 ELSE desc_text END, sla=CASE WHEN $3::text IS NOT NULL THEN $3 ELSE sla END WHERE id=$4 RETURNING *',
    [status, desc_text || '', sla || null, req.params.id]
  );
  if (r.rows.length === 0) return res.status(404).json({ error: '工单不存在' });
  res.json(r.rows[0]);
});

router.get('/:id', async (req, res) => {
  const t = await query('SELECT * FROM tickets WHERE id=$1', [req.params.id]);
  if (t.rows.length === 0) return res.status(404).json({ error: '工单不存在' });
  const alerts = await query('SELECT a.* FROM alerts a JOIN ticket_alerts ta ON a.id=ta.alert_id WHERE ta.ticket_id=$1', [req.params.id]);
  res.json({ ...t.rows[0], alerts: alerts.rows });
});

export default router;
