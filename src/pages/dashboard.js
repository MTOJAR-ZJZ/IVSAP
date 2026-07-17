/* ========================================
   Stream Analyzer — Dashboard Page
   ======================================== */

function renderDashboard() {
  const pendingAlerts = window.DB.alerts.filter(a => a.status === 'pending').length;
  const onlineStreams = window.DB.streams.filter(s => s.status === 'online').length;

  function getStreamAlerts(streamName) {
    return window.DB.alerts.filter(a => a.stream === streamName).slice(0, 3);
  }

  window.setPageContent(html`
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
      <span style="font-size:12px;padding:2px 10px;border-radius:4px;background:#f0fdf4;color:var(--success);border:1px solid #bbf7d0;font-weight:600">🔬 模拟模式</span>
      <span style="font-size:12px;color:var(--text-secondary)">数据本地存储，刷新不丢失</span>
    </div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">在线设备数</div>
        <div class="stat-value">${onlineStreams}<span style="font-size:14px;color:var(--text-secondary)"> / ${window.DB.streams.length}</span></div>
        <div class="stat-change up">↑ 2 较昨日</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">今日告警总数</div>
        <div class="stat-value">${window.DB.alerts.filter(a => a.time.startsWith(new Date().toISOString().slice(0, 10))).length}</div>
        <div class="stat-change up">↑ 15% 较昨日</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">待处理告警</div>
        <div class="stat-value">${pendingAlerts}</div>
        <div class="stat-change down">需及时处置</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">平均响应时长</div>
        <div class="stat-value">2.3<span style="font-size:14px;color:var(--text-secondary)"> min</span></div>
        <div class="stat-change up">↓ 12% 较昨日</div>
      </div>
    </div>

    <div class="quick-actions">
      <button class="btn btn-primary" onclick="navigate('streams')">＋ 新增推流</button>
      <button class="btn btn-success" onclick="navigate('detection')">＋ 创建检测</button>
      <button class="btn btn-outline" onclick="navigate('alerts')">📋 告警列表</button>
      <button class="btn btn-outline" onclick="navigate('tickets')">📋 工单列表</button>
    </div>

    <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:12px">视频流列表</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-bottom:24px">
      ${window.DB.streams.map(s => {
        const detections = window.DB.detections.filter(d => d.stream === s.name);
        return html`
          <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06)">
            <div style="background:#1a1a2e;height:160px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden">
              <div class="video-player" data-stream="${s.id}" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:36px;color:#666">⏳ 加载中...</div>
              <span class="badge badge-${s.status === 'online' ? 'online' : 'offline'}" style="position:absolute;top:8px;right:8px">
                <span class="badge-dot"></span>${s.status === 'online' ? '在线' : '离线'}
              </span>
            </div>
            <div style="padding:12px 14px">
              <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:4px">${s.name}</div>
              <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">${s.protocol} · ${s.res} · ${s.fps}FPS</div>
              <div style="display:flex;gap:4px;flex-wrap:wrap">
                ${detections.map(d => html`<span class="badge badge-online" style="font-size:11px">${d.algo}</span>`).join('')}
                ${detections.length === 0 ? '<span style="font-size:12px;color:var(--text-secondary)">未配置检测</span>' : ''}
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:12px">实时告警流</div>
    ${window.DB.streams.filter(s => s.status === 'online').map(s => {
      const streamAlerts = getStreamAlerts(s.name);
      if (streamAlerts.length === 0) return '';
      return html`
        <div class="alert-stream" style="margin-bottom:12px">
          <div class="alert-stream-header">
            <span class="alert-stream-dot"></span>
            ${s.name}
            <span style="margin-left:auto;font-weight:400;font-size:12px;color:var(--text-secondary)">${streamAlerts.length} 条告警</span>
          </div>
          <div class="alert-stream-list">
            ${streamAlerts.map(a => html`
              <div class="alert-stream-item ${a.status === 'pending' ? 'new' : ''}">
                <span class="badge ${a.status === 'pending' ? 'badge-pending' : a.status === 'confirmed' ? 'badge-done' : a.status === 'ignored' ? 'badge-offline' : 'badge-error'}">
                  <span class="badge-dot"></span>${a.type}
                </span>
                <span style="color:var(--text-secondary)">${a.confidence}%</span>
                <span class="alert-time">${a.time.slice(11)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('')}
    ${window.DB.streams.filter(s => s.status === 'online').every(s => getStreamAlerts(s.name).length === 0) ? html`
      <div style="text-align:center;padding:20px;color:var(--text-secondary);font-size:13px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;margin-bottom:24px">暂无告警</div>
    ` : ''}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="card">
        <div class="card-header"><span class="card-title">告警趋势（今日）</span></div>
        <div class="card-body">
          <div class="chart-placeholder">📈 折线图 — 按小时告警趋势</div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">告警类型分布</span></div>
        <div class="card-body">
          <div class="chart-placeholder">🥧 饼图 — 各算法类型占比</div>
        </div>
      </div>
    </div>
  `);
  setTimeout(() => initVideoPlayers(), 100);
}
window.renderDashboard = renderDashboard;

// ===================== SIMULATED REALTIME ALERTS =====================

function simulateAlert() {
  const types = ['人员入侵','烟火检测','物品遗留','区域越界'];
  const streams = window.DB.streams.filter(s => s.status === 'online');
  if (streams.length === 0) return;
  const s = streams[Math.floor(Math.random() * streams.length)];
  const type = types[Math.floor(Math.random() * types.length)];
  const conf = Math.floor(Math.random() * 40) + 55;
  const alert = {
    id: 'A' + String(window.DB.alerts.length + 1).padStart(3,'0'),
    stream: s.name, type, confidence: conf,
    status: 'pending', time: new Date().toLocaleString('zh-CN'),
    img: '📷', note: '',
  };
  window.DB.alerts.unshift(alert);
  if (window.DB.alerts.length > 50) window.DB.alerts.length = 50;
  window.DB._save();

  if (window.AppState.currentPage === 'dashboard') renderDashboard();

  updateNavBadges();

  const notifDot = document.querySelector('.notif-dot');
  if (notifDot) notifDot.style.display = 'block';

  if (conf >= 80) {
    setTimeout(() => {
      const ticketId = 'WO-' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '-' + String(window.DB.tickets.length + 1).padStart(5,'0');
      const ticketTitle = `${s.name} ${type}告警`;
      window.DB.tickets.unshift({
        id: ticketId, title, priority: 'high', status: 'pending_assign', assignee: '-',
        alerts: [alert.id], sla: '-', createdAt: new Date().toLocaleString('zh-CN'),
        desc: '', photos: [],
      });
      window.DB._save();
      updateNavBadges();
      if (window.AppState.currentPage === 'alerts') window.renderAlerts();
      if (window.AppState.currentPage === 'tickets') window.renderTickets(window.AppState.currentTicketMode);
      addTicketLog(ticketId, `自动创建 ${ticketTitle}`);
      toast(`高置信告警自动创建工单: ${ticketId}`, 'info');
    }, 2000);
  }
}
window.simulateAlert = simulateAlert;

function updateNavBadges() {
  const pendingAlerts = window.DB.alerts.filter(a => a.status === 'pending').length;
  const activeTickets = window.DB.tickets.filter(t => t.status === 'pending_assign' || t.status === 'processing').length;
  const aBadge = document.querySelector('[data-page="alerts"] .nav-badge');
  const tBadge = document.querySelector('[data-page="tickets"] .nav-badge');
  if (aBadge) aBadge.textContent = pendingAlerts;
  if (tBadge) tBadge.textContent = activeTickets;
}
window.updateNavBadges = updateNavBadges;
