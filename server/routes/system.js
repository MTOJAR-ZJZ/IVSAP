import { Router } from 'express';
import { query } from '../db/pool.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// GET all config as JSON object
router.get('/config', async (req, res) => {
  const result = await query('SELECT key, value FROM system_config');
  const config = {};
  result.rows.forEach(r => { config[r.key] = isNaN(Number(r.value)) ? r.value : Number(r.value); });
  res.json(config);
});

// PUT save config
router.put('/config', async (req, res) => {
  for (const [key, value] of Object.entries(req.body)) {
    await query('INSERT INTO system_config (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2', [key, String(value)]);
  }
  res.json({ message: '已保存' });
});

// API Models
router.get('/api-models', async (req, res) => {
  const result = await query('SELECT id, name, provider, api_url, is_default FROM api_models ORDER BY id');
  res.json(result.rows);
});

router.put('/api-models/:id', async (req, res) => {
  const { name, provider, api_url, api_key } = req.body;
  if (api_key) {
    await query('UPDATE api_models SET name=$1, provider=$2, api_url=$3, api_key=$4 WHERE id=$5',
      [name, provider, api_url, api_key, req.params.id]);
  } else {
    await query('UPDATE api_models SET name=$1, provider=$2, api_url=$3 WHERE id=$4',
      [name, provider, api_url, req.params.id]);
  }
  const r = await query('SELECT id, name, provider, api_url, is_default FROM api_models WHERE id=$1', [req.params.id]);
  res.json(r.rows[0]);
});

router.post('/api-models/:id/default', async (req, res) => {
  await query('UPDATE api_models SET is_default=false');
  await query('UPDATE api_models SET is_default=true WHERE id=$1', [req.params.id]);
  res.json({ message: '默认模型已切换' });
});

// Operation logs
router.get('/logs', async (req, res) => {
  const result = await query('SELECT * FROM operation_logs ORDER BY created_at DESC LIMIT 50');
  res.json(result.rows);
});

// Ticket rules
router.get('/ticket-rules', async (req, res) => {
  const result = await query('SELECT * FROM ticket_rules ORDER BY id LIMIT 1');
  res.json(result.rows[0] || null);
});

router.put('/ticket-rules', async (req, res) => {
  const { algo_type, confidence, hit_count, assign_strategy } = req.body;
  const exists = await query('SELECT id FROM ticket_rules LIMIT 1');
  if (exists.rows.length > 0) {
    await query('UPDATE ticket_rules SET algo_type=$1, confidence=$2, hit_count=$3, assign_strategy=$4 WHERE id=$5',
      [algo_type || '全部', confidence || 80, hit_count || 3, assign_strategy || '按人员忙闲度', exists.rows[0].id]);
  } else {
    await query('INSERT INTO ticket_rules (algo_type, confidence, hit_count, assign_strategy) VALUES ($1,$2,$3,$4)',
      [algo_type || '全部', confidence || 80, hit_count || 3, assign_strategy || '按人员忙闲度']);
  }
  res.json({ message: '规则已保存' });
});

// Schedules
router.get('/schedules', async (req, res) => {
  const result = await query('SELECT s.*, u.name AS user_name FROM schedules s LEFT JOIN users u ON s.user_id=u.id ORDER BY s.year, s.month, s.date');
  res.json(result.rows);
});

export default router;
