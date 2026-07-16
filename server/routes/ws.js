import { WebSocketServer } from 'ws';
import { query } from '../db/pool.js';

// Simulate real-time alerts — in production, this listens to a message queue
let clients = new Set();

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws/alerts' });

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('WS client connected, total:', clients.size);

    ws.on('close', () => {
      clients.delete(ws);
      console.log('WS client disconnected, total:', clients.size);
    });
  });

  // Simulate alerts every 8–15s (for demo)
  let simTimer;
  function scheduleSim() {
    const delay = 8000 + Math.random() * 7000;
    simTimer = setTimeout(async () => {
      try {
        const types = ['人员入侵','烟火检测','物品遗留','区域越界'];
        const streams = await query("SELECT id, name FROM streams WHERE status='online'");
        if (streams.rows.length === 0) return scheduleSim();
        const s = streams.rows[Math.floor(Math.random() * streams.rows.length)];
        const type = types[Math.floor(Math.random() * types.length)];
        const conf = Math.floor(Math.random() * 40) + 55;
        const count = (await query("SELECT count(*) FROM alerts")).rows[0].count;
        const aid = 'A' + String(parseInt(count) + 1).padStart(3,'0');

        await query(
          'INSERT INTO alerts (id, stream_id, type, confidence) VALUES ($1,$2,$3,$4)',
          [aid, s.id, type, conf]
        );

        const alert = { id: aid, stream_id: s.id, stream_name: s.name, type, confidence: conf, status: 'pending' };
        // Broadcast to all connected clients
        const msg = JSON.stringify({ type: 'new_alert', data: alert });
        clients.forEach(c => { if (c.readyState === 1) c.send(msg); });

        // Auto-create ticket for high confidence alerts
        if (conf >= 80) {
          setTimeout(async () => {
            const today = new Date().toISOString().slice(0,10).replace(/-/g,'');
            const tCount = (await query("SELECT count(*) FROM tickets")).rows[0].count;
            const tid = `WO-${today}-${String(parseInt(tCount) + 1).padStart(5,'0')}`;
            const title = `${s.name} ${type}告警`;
            await query('INSERT INTO tickets (id, title, priority) VALUES ($1,$2,$3)', [tid, title, 'high']);
            await query('INSERT INTO ticket_alerts (ticket_id, alert_id) VALUES ($1,$2)', [tid, aid]);
            // Broadcast
            const ticket = { id: tid, title, priority: 'high', status: 'pending_assign' };
            clients.forEach(c => { if (c.readyState === 1) c.send(JSON.stringify({ type: 'new_ticket', data: ticket })); });
          }, 2000);
        }
      } catch (err) {
        console.error('Sim alert error:', err);
      }
      scheduleSim();
    }, delay);
  }

  setTimeout(scheduleSim, 5000);

  return wss;
}
