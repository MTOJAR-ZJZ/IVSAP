/* ========================================
   Stream Analyzer — Main Application
   ======================================== */

// 数据库在 db.js 中定义，通过 window.DB 访问

// ===================== STATE =====================

let currentPage = 'dashboard';
let currentTicketMode = 'list';
let selectedStreams = new Set();
let selectedAlerts = new Set();
let selectedTickets = new Set();
let alertCount = 0;
let scheduleYear, scheduleMonth;

// ===================== UTILS =====================

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function html(strings, ...vals) {
  return strings.reduce((acc, s, i) => acc + s + (vals[i] || ''), '');
}

function toast(msg, type = 'success') {
  const c = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, 3000);
}

function modal(htmlContent) {
  const overlay = document.getElementById('modalOverlay');
  const content = document.getElementById('modalContent');
  content.innerHTML = htmlContent;
  overlay.style.display = 'flex';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.style.display = 'none'; };
}

function closeModal() {
  document.getElementById('modalOverlay').style.display = 'none';
}

function formatTime(d) {
  const dt = d ? new Date(d) : new Date();
  return dt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ===================== PAGE RENDERERS =====================

// ---- Dashboard ----
function renderDashboard() {
  const pendingAlerts = window.DB.alerts.filter(a => a.status === 'pending').length;
  const onlineStreams = window.DB.streams.filter(s => s.status === 'online').length;

  // 每个视频流关联的告警
  function getStreamAlerts(streamName) {
    return window.DB.alerts.filter(a => a.stream === streamName).slice(0, 3);
  }

  setPageContent(html`
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
            <div style="background:#1a1a2e;height:160px;display:flex;align-items:center;justify-content:center;font-size:48px;position:relative">
              🎥
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
}

// ---- Streams ----
function renderStreams() {
  setPageContent(html`
    <div class="quick-actions" style="margin-bottom:16px">
      <button class="btn btn-primary" onclick="showAddStream()">＋ 新增推流</button>
      <button class="btn btn-outline btn-sm" onclick="batchStreamAction('enable')">批量启用</button>
      <button class="btn btn-outline btn-sm" onclick="batchStreamAction('disable')">批量停用</button>
      <button class="btn btn-danger btn-sm" onclick="batchStreamAction('delete')">批量删除</button>
      <span style="margin-left:auto;font-size:12px;color:var(--text-secondary)" id="streamSelectedCount">已选 0 项</span>
    </div>

    <div class="card">
      <div class="card-header"><span class="card-title">视频流列表</span></div>
      <div class="card-body" style="padding:0">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th style="width:36px"><input type="checkbox" onchange="toggleAllStreams(this.checked)" /></th>
                <th>流名称</th>
                <th>推流地址</th>
                <th>协议</th>
                <th>分辨率</th>
                <th>帧率</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              ${window.DB.streams.map(s => html`
                <tr>
                  <td><input type="checkbox" data-id="${s.id}" onchange="toggleStream('${s.id}')" ${selectedStreams.has(s.id) ? 'checked' : ''} /></td>
                  <td><strong>${s.name}</strong></td>
                  <td style="font-size:12px;color:var(--text-secondary);max-width:200px;overflow:hidden;text-overflow:ellipsis">${s.addr}</td>
                  <td>${s.protocol}</td>
                  <td>${s.res}</td>
                  <td>${s.fps}FPS</td>
                  <td>
                    <span class="badge badge-${s.status === 'online' ? 'online' : 'offline'}">
                      <span class="badge-dot"></span>${s.status === 'online' ? '在线' : '离线'}
                    </span>
                  </td>
                  <td>
                    <button class="btn btn-outline btn-xs" onclick="editStream('${s.id}')">编辑</button>
                    <button class="btn btn-danger btn-xs" onclick="deleteStream('${s.id}')">删除</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `);
  // 页面渲染后执行 ping 检测
  setTimeout(() => {
    window.DB.streams.forEach(s => pingStream(s.id));
  }, 500);
  updateStreamSelectedCount();
}


// ---- Detection ----
function renderDetection() {
  setPageContent(html`
    <div class="quick-actions" style="margin-bottom:16px">
      <button class="btn btn-primary" onclick="showAddDetection()">＋ 创建检测项目</button>
      <button class="btn btn-outline" onclick="showAlgoManager()">🧠 算法管理</button>
    </div>

    <div class="card">
      <div class="card-header"><span class="card-title">检测项目列表</span></div>
      <div class="card-body" style="padding:0">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>项目名称</th>
                <th>关联视频流</th>
                <th>算法类型</th>
                <th>ROI 区域</th>
                <th>灵敏度</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              ${window.DB.detections.map(d => html`
                <tr>
                  <td><strong>${d.name}</strong></td>
                  <td>${d.stream}</td>
                  <td><span class="badge badge-online"><span class="badge-dot"></span>${d.algo}</span></td>
                  <td style="font-size:12px;color:var(--text-secondary)">${d.roi}</td>
                  <td>${d.sensitivity}</td>
                  <td>
                    <span class="badge ${d.status === 'running' ? 'badge-online' : 'badge-offline'}">
                      <span class="badge-dot"></span>${d.status === 'running' ? '运行中' : '已停止'}
                    </span>
                  </td>
                  <td>
                    <button class="btn btn-${d.status === 'running' ? 'warning' : 'success'} btn-xs" onclick="toggleDetection('${d.id}')">
                      ${d.status === 'running' ? '停止' : '启动'}
                    </button>
                    <button class="btn btn-outline btn-xs" onclick="editDetection('${d.id}')">配置</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div style="margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="card">
        <div class="card-header"><span class="card-title">ROI 区域配置</span></div>
        <div class="card-body">
          <div class="chart-placeholder" style="height:240px">🖼️ 视频预览 + ROI 绘制区域</div>
          <div style="display:flex;gap:8px;margin-top:12px;justify-content:center">
            <button class="btn btn-outline btn-sm">✏️ 绘制矩形</button>
            <button class="btn btn-outline btn-sm">🔷 绘制多边形</button>
            <button class="btn btn-outline btn-sm">🚫 排除区域</button>
            <button class="btn btn-outline btn-sm">📥 导入 JSON</button>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">灵敏度与参数</span></div>
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">灵敏度阈值：0.65</label>
            <input type="range" min="0.1" max="0.9" step="0.05" value="0.65" style="width:100%;accent-color:var(--primary)" />
            <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-secondary)">0.1 低灵敏 ← → 高灵敏 0.9</div>
          </div>
          <div style="margin-top:16px">
            <label class="form-label">当前 ROI 坐标（JSON）</label>
            <textarea class="form-input" rows="4" style="font-family:monospace;font-size:12px">{"polygons":[{"points":[[100,200],[300,150],[400,350],[150,400]],"type":"detect"}],"excludes":[]}</textarea>
          </div>
        </div>
      </div>
    </div>
  `);
}

// ---- Algorithm Manager（弹窗形式）----
window.showAlgoManager = () => {
  modal(html`
    <div class="modal-title">算法类型管理</div>
    <div style="margin-bottom:16px">
      <div style="font-size:13px;color:var(--text-secondary);margin-bottom:10px">当前支持的算法类型（共 ${window.DB.algoTypes.length} 种）</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${window.DB.algoTypes.map((a, i) => html`
          <div style="display:flex;align-items:center;gap:6px;background:#f8fafc;border:1px solid var(--border);border-radius:6px;padding:6px 10px">
            <span style="font-size:13px;font-weight:600;cursor:pointer" onclick="editAlgoPrompt(${i})" title="点击编辑提示词">${typeof a === 'string' ? a : a.name}</span>
            <span style="cursor:pointer;color:#999;font-size:16px;line-height:1" onclick="removeAlgoType(${i})" title="移除该算法">×</span>
          </div>
        `).join('')}
      </div>
    </div>
    <div style="display:flex;gap:8px">
      <input class="form-input" placeholder="输入新算法名称" id="newAlgoName" style="flex:1" />
      <button class="btn btn-primary" onclick="addAlgoType()">＋ 添加</button>
    </div>
    <div style="margin-top:12px;font-size:12px;color:var(--text-secondary)">
      💡 点击算法名称可编辑提示词 · 大模型接口请在系统管理中配置
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="closeModal()">完成</button>
    </div>
  `);
};

window.editAlgoPrompt = (index) => {
  const a = window.DB.algoTypes[index];
  const algoName = typeof a === 'string' ? a : a.name;
  const prompt = a.prompt || '';

  modal(html`
    <div class="modal-title">编辑提示词 — ${algoName}</div>
    <div class="form-group">
      <label class="form-label">提示词（Prompt）</label>
      <textarea class="form-input" rows="6" placeholder="输入 AI 检测提示词..." id="algoPrompt" style="font-size:13px">${prompt}</textarea>
      <div style="font-size:11px;color:var(--text-secondary);margin-top:4px">提示词将作为系统指令发送给大模型，用于指导 AI 分析视频画面</div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="showAlgoManager()">返回</button>
      <button class="btn btn-primary" onclick="saveAlgoPrompt(${index})">保存提示词</button>
    </div>
  `);
};

window.saveAlgoPrompt = (index) => {
  const a = window.DB.algoTypes[index];
  if (typeof a === 'string') window.DB.algoTypes[index] = { name: a };
  window.DB.algoTypes[index].prompt = document.getElementById('algoPrompt').value;
  window.DB._save();
  toast('提示词已保存');
  showAlgoManager();
};

window.addAlgoType = () => {
  const name = document.getElementById('newAlgoName').value.trim();
  if (!name) { toast('请输入算法名称', 'error'); return; }
  if (window.DB.algoTypes.some(a => (typeof a === 'string' ? a : a.name) === name)) { toast('该算法已存在', 'error'); return; }
  window.DB.algoTypes.push({ name, prompt: '' });
  document.getElementById('newAlgoName').value = '';
  window.DB._save();
  toast(`算法「${name}」已添加`);
  window.showAlgoManager();
};

window.removeAlgoType = (index) => {
  const a = window.DB.algoTypes[index];
  const name = typeof a === 'string' ? a : a.name;
  const inUse = window.DB.detections.some(d => d.algo === name);
  if (inUse) {
    if (!confirm(`算法「${name}」正在被检测项目使用，确认移除？`)) return;
    window.DB.detections.forEach(d => { if (d.algo === name) d.algo = '未配置'; });
  }
  window.DB.algoTypes.splice(index, 1);
  window.DB._save();
  toast(`算法「${name}」已移除`);
  window.showAlgoManager();
};

// Alerts
window.toggleAlert = (id) => {
  if (selectedAlerts.has(id)) selectedAlerts.delete(id);
  else selectedAlerts.add(id);
  const el = document.getElementById('alertSelectedCount');
  if (el) el.textContent = `已选 ${selectedAlerts.size} 项`;
};

window.toggleAllAlerts = (checked) => {
  window.DB.alerts.forEach(a => checked ? selectedAlerts.add(a.id) : selectedAlerts.delete(a.id));
  renderAlerts();
};

window.handleAlert = (id, action) => {
  const a = window.DB.alerts.find(x => x.id === id);
  const actionNames = { confirmed: '已确认', ignored: '已忽略', false: '误报' };
  a.status = action;
  if (action === 'confirmed') {
    const note = prompt('请输入处置备注：');
    if (note) a.note = note;
  }
  toast(`告警 ${a.id} 标记为 ${actionNames[action]}`);
  window.DB._save();
  renderAlerts();
  updateNavBadges();
};

window.showAlertImg = () => {
  modal(html`
    <div class="modal-title">告警截图</div>
    <div style="background:#1a1a2e;height:300px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:48px">📷</div>
    <div style="margin-top:12px;font-size:13px;color:var(--text-secondary)">告警现场截图 — 可点击放大查看详情</div>
    <div class="modal-actions"><button class="btn btn-outline" onclick="closeModal()">关闭</button></div>
  `);
};

window.batchCreateTicket = () => {
  if (selectedAlerts.size === 0) { toast('请先勾选要合并的告警', 'error'); return; }
  const selectedAlertList = window.DB.alerts.filter(a => selectedAlerts.has(a.id));
  const alertIds = selectedAlertList.map(a => a.id);
  const types = selectedAlertList.map(a => a.type);
  const title = types.join('、') + ' 合并工单';
  const ticketId = 'WO-' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '-' + String(window.DB.tickets.length + 1).padStart(5,'0');
  window.DB.tickets.unshift({
    id: ticketId, title, priority: 'mid', status: 'pending_assign', assignee: '-',
    alerts: alertIds, sla: '-', createdAt: new Date().toLocaleString('zh-CN'),
    desc: '', photos: [],
  });
  // 将关联告警标记为已确认
  selectedAlertList.forEach(a => { a.status = 'confirmed'; a.note = `已合并为工单 ${ticketId}`; });
  selectedAlerts.clear();
  window.DB._save();
  toast(`合并创建工单成功：${title}`);
  navigate('tickets');
};

// Tickets
window.showCreateTicket = () => {
  modal(html`
    <div class="modal-title">手动创建工单</div>
    <div class="form-group">
      <label class="form-label">工单标题 *</label>
      <input class="form-input" placeholder="如：北门人员入侵处置" id="ticketTitle" />
    </div>
    <div class="form-group">
      <label class="form-label">关联告警</label>
      <select class="form-select" id="ticketAlert">
        <option value="">不关联</option>
        ${window.DB.alerts.filter(a => a.status === 'pending').map(a => `<option value="${a.id}">${a.id} - ${a.type}@${a.stream}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">优先级</label>
      <select class="form-select" id="ticketPriority"><option value="high">高</option><option value="mid" selected>中</option><option value="low">低</option></select>
    </div>
    <div class="form-group">
      <label class="form-label">描述</label>
      <textarea class="form-input" rows="3" placeholder="工单描述..." id="ticketDesc"></textarea>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="saveTicket()">创建</button>
    </div>
  `);
};

window.saveTicket = () => {
  const title = document.getElementById('ticketTitle').value;
  if (!title) { toast('请输入工单标题', 'error'); return; }
  window.DB.tickets.unshift({
    id: 'WO-' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '-' + String(window.DB.tickets.length + 1).padStart(5,'0'),
    title, priority: document.getElementById('ticketPriority').value,
    status: 'pending_assign', assignee: '-',
    alerts: document.getElementById('ticketAlert').value ? [document.getElementById('ticketAlert').value] : [],
    sla: '-', createdAt: new Date().toLocaleString('zh-CN'),
    desc: document.getElementById('ticketDesc').value || '', photos: [],
  });
  closeModal();
  toast('工单创建成功');
  window.DB._save();
  renderTickets('list');
  updateNavBadges();
};

window.showTicketDetail = (id) => {
  const t = window.DB.tickets.find(x => x.id === id);
  const statusMap = { pending_assign: '待分配', processing: '处理中', review: '待验收', closed: '已关闭' };
  modal(html`
    <div class="modal-title">工单详情 — ${t.id}</div>
    <div style="margin-bottom:16px">
      <div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:8px">${t.title}</div>
      <div style="display:flex;gap:12px;font-size:13px;color:var(--text-secondary)">
        <span>状态：<strong>${statusMap[t.status]}</strong></span>
        <span>责任人：<strong>${t.assignee}</strong></span>
        <span>SLA：<strong>${t.sla}</strong></span>
      </div>
    </div>
    <div style="background:rgba(255,255,255,.03);padding:14px;border-radius:8px;margin-bottom:12px">
      <div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px">处置记录</div>
      ${t.desc ? html`<div style="font-size:13px">${t.desc}</div>` : html`<div style="font-size:13px;color:var(--text-secondary)">暂无处置记录</div>`}
    </div>
    <div style="background:rgba(255,255,255,.03);padding:14px;border-radius:8px;margin-bottom:12px">
      <div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px">关联告警</div>
      ${t.alerts.length > 0 ? t.alerts.map(aid => {
        const a = window.DB.alerts.find(x => x.id === aid);
        return a ? `<div style="font-size:13px">${a.id} · ${a.type} · ${a.stream} · ${a.confidence}%</div>` : '';
      }).join('') : '<div style="font-size:13px;color:var(--text-secondary)">无关联告警</div>'}
    </div>
    ${t.status === 'processing' ? html`
      <div class="form-group">
        <label class="form-label">处置反馈</label>
        <textarea class="form-input" rows="3" placeholder="填写处置描述..." id="ticketFeedback"></textarea>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:12px">
        <button class="btn btn-outline btn-sm">📸 上传现场照片</button>
        <button class="btn btn-outline btn-sm">💾 保存至知识库</button>
      </div>
    ` : ''}
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="closeModal()">关闭</button>
      ${t.status === 'pending_assign' ? `<button class="btn btn-primary" onclick="closeModal();assignTicket('${t.id}')">分配</button>` : ''}
      ${t.status === 'processing' ? `<button class="btn btn-success" onclick="submitTicketFeedback('${t.id}')">提交处置</button>` : ''}
    </div>
  `);
};

window.assignTicket = (id) => {
  const users = window.DB.users.filter(u => u.status === 'active' && u.role === '值班工程师');
  modal(html`
    <div class="modal-title">分配工单</div>
    <div class="form-group">
      <label class="form-label">分配策略</label>
      <select class="form-select" id="assignStrategy">
        <option value="auto">自动分配（按忙闲度）</option>
        <option value="manual">手动指派</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">责任人</label>
      <select class="form-select" id="assignUser">
        ${users.map(u => `<option value="${u.name}">${u.name}（${u.dept}）</option>`).join('')}
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="doAssign('${id}')">确认分配</button>
    </div>
  `);
};

window.doAssign = (id) => {
  const t = window.DB.tickets.find(x => x.id === id);
  const user = document.getElementById('assignUser').value;
  t.assignee = user;
  t.status = 'processing';
  t.sla = '剩余 29min';
  closeModal();
  addTicketLog(t.id, `分配 ${t.title} 给 ${user}`);
  toast(`工单已分配给 ${user}，通知已发送`);
  window.DB._save();
  renderTickets('list');
  updateNavBadges();
};

window.submitTicketFeedback = (id) => {
  const t = window.DB.tickets.find(x => x.id === id);
  const fb = document.getElementById('ticketFeedback');
  if (fb && fb.value) t.desc = fb.value;
  t.status = 'review';
  t.sla = '待验收';
  addTicketLog(t.id, `提交验收 ${t.title}`);
  toast('处置完成，已提交验收');
  window.DB._save();
  renderTickets('list');
  updateNavBadges();
};

window.submitTicketReview = (id) => {
  const t = window.DB.tickets.find(x => x.id === id);
  t.status = 'review';
  t.sla = '待验收';
  addTicketLog(t.id, `提交验收 ${t.title}`);
  toast('已提交验收申请');
  window.DB._save();
  renderTickets('list');
  updateNavBadges();
};

window.approveTicket = (id) => {
  const t = window.DB.tickets.find(x => x.id === id);
  t.status = 'closed';
  t.sla = '已完成';
  addTicketLog(t.id, `验收通过 ${t.title}`);
  toast('工单验收通过，已关闭');
  window.DB._save();
  renderTickets('list');
  updateNavBadges();
};

window.rejectTicket = (id) => {
  const t = window.DB.tickets.find(x => x.id === id);
  t.status = 'processing';
  t.sla = '已驳回-请重试';
  addTicketLog(t.id, `驳回 ${t.title}`);
  toast('工单已驳回，返回处理中');
  window.DB._save();
  renderTickets('list');
  updateNavBadges();
};

window.showTicketRules = () => {
  const rules = window.DB.config.ticketRules || { algoType: '全部', confidence: 80, hitCount: 3, assignStrategy: '按人员忙闲度' };
  modal(html`
    <div class="modal-title">告警转工单规则</div>
    <div class="form-group">
      <label class="form-label">算法类型</label>
      <select class="form-select" id="ruleAlgoType">
        <option ${rules.algoType === '全部' ? 'selected' : ''}>全部</option>
        <option ${rules.algoType === '人员入侵' ? 'selected' : ''}>人员入侵</option>
        <option ${rules.algoType === '烟火检测' ? 'selected' : ''}>烟火检测</option>
        <option ${rules.algoType === '物品遗留' ? 'selected' : ''}>物品遗留</option>
        <option ${rules.algoType === '区域越界' ? 'selected' : ''}>区域越界</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">置信度阈值</label>
      <input class="form-input" type="number" id="ruleConfidence" value="${rules.confidence}" min="0" max="100" /> %
    </div>
    <div class="form-group">
      <label class="form-label">连续命中次数</label>
      <input class="form-input" type="number" id="ruleHitCount" value="${rules.hitCount}" min="1" />
    </div>
    <div class="form-group">
      <label class="form-label">自动分配策略</label>
      <select class="form-select" id="ruleStrategy">
        <option ${rules.assignStrategy === '按人员忙闲度' ? 'selected' : ''}>按人员忙闲度</option>
        <option ${rules.assignStrategy === '按技能组轮询' ? 'selected' : ''}>按技能组轮询</option>
        <option ${rules.assignStrategy === '按值班表' ? 'selected' : ''}>按值班表</option>
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="window.saveTicketRules()">保存规则</button>
    </div>
  `);
};

window.saveTicketRules = () => {
  window.DB.config.ticketRules = {
    algoType: document.getElementById('ruleAlgoType').value,
    confidence: parseInt(document.getElementById('ruleConfidence').value) || 80,
    hitCount: parseInt(document.getElementById('ruleHitCount').value) || 3,
    assignStrategy: document.getElementById('ruleStrategy').value,
  };
  closeModal();
  window.DB._save();
  toast('规则保存成功', 'success');
};

// Users
window.toggleOrgChildren = (el) => {
  const children = el.nextElementSibling;
  if (children && children.classList.contains('org-children')) {
    children.style.display = children.style.display === 'none' ? 'block' : 'none';
    el.querySelector('.org-toggle').textContent = children.style.display === 'none' ? '▸' : '▾';
  }
};

window.showAddDept = () => {
  modal(html`
    <div class="modal-title">新增部门</div>
    <div class="form-group">
      <label class="form-label">部门名称 *</label>
      <input class="form-input" placeholder="如：三值班组" id="deptName" />
    </div>
    <div class="form-group">
      <label class="form-label">上级部门</label>
      <select class="form-select" id="deptParent">
        <option value="">（顶级部门）</option>
        ${window.DB.depts.map(d => html`<option value="${d.id}">${d.name}</option>`).join('')}
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="saveAddDept()">创建</button>
    </div>
  `);
};

window.saveAddDept = () => {
  const name = document.getElementById('deptName').value;
  if (!name) { toast('请输入部门名称', 'error'); return; }
  const parentId = document.getElementById('deptParent').value;
  const newDept = { id: 'DEPT' + Date.now(), name, children: [] };
  if (parentId) {
    const parent = findDept(window.DB.depts, parentId);
    if (parent) parent.children.push(newDept);
  } else {
    window.DB.depts.push(newDept);
  }
  closeModal();
  window.DB._save();
  toast(`部门「${name}」创建成功`);
  renderUsers();
};

function findDept(list, id) {
  for (const d of list) {
    if (d.id === id) return d;
    if (d.children) {
      const found = findDept(d.children, id);
      if (found) return found;
    }
  }
  return null;
}

window.showAddUser = () => {
  modal(html`
    <div class="modal-title">添加人员</div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">姓名 *</label>
        <input class="form-input" placeholder="姓名" id="userName" />
      </div>
      <div class="form-group">
        <label class="form-label">手机号 *</label>
        <input class="form-input" placeholder="手机号（将作为登录账号）" id="userPhone" oninput="document.getElementById('userAccount').value=this.value" />
        <input type="hidden" id="userAccount" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">邮箱</label>
        <input class="form-input" placeholder="邮箱" id="userEmail" />
      </div>
      <div class="form-group">
        <label class="form-label">所属部门</label>
        <select class="form-select" id="userDept">
          ${flattenDepts(window.DB.depts).map(d => `<option>${d}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">角色</label>
      <select class="form-select" id="userRole"><option>值班工程师</option><option>运维主管</option><option>系统管理员</option><option>业务分析师</option></select>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="saveAddUser()">保存</button>
    </div>
  `);
};

window.saveAddUser = () => {
  const name = document.getElementById('userName').value;
  const phone = document.getElementById('userPhone').value;
  if (!name) { toast('请输入姓名', 'error'); return; }
  if (!phone) { toast('请输入手机号', 'error'); return; }
  window.DB.users.push({
    id: 'U' + String(window.DB.users.length + 1).padStart(3,'0'),
    name,
    account: phone,
    dept: document.getElementById('userDept').value,
    role: document.getElementById('userRole').value,
    phone,
    email: document.querySelector('#userEmail')?.value || '',
    status: 'active',
  });
  closeModal();
  toast('人员添加成功');
  window.DB._save();
  renderUsers();
};

window.exportAddressBook = () => {
  // 生成 CSV
  let csv = '姓名,账号,所属部门,角色,手机号,邮箱,状态\n';
  window.DB.users.forEach(u => {
    csv += `${u.name},${u.account},${u.dept},${u.role},${u.phone},${u.email},${u.status === 'active' ? '启用' : '禁用'}\n`;
  });
  // 下载文件
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel Chinese support
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '通讯录_' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('通讯录已导出');
};

window.showEditUser = (id) => {
  const u = window.DB.users.find(x => x.id === id);
  if (!u) return;
  modal(html`
    <div class="modal-title">编辑人员</div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">姓名 *</label>
        <input class="form-input" value="${u.name}" id="editUserName" />
      </div>
      <div class="form-group">
        <label class="form-label">手机号 *</label>
        <input class="form-input" value="${u.phone}" id="editUserPhone" oninput="document.getElementById('editUserAccount').value=this.value" />
        <input type="hidden" id="editUserAccount" value="${u.phone}" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">邮箱</label>
        <input class="form-input" value="${u.email}" id="editUserEmail" />
      </div>
      <div class="form-group">
        <label class="form-label">所属部门</label>
        <input class="form-input" value="${u.dept}" id="editUserDept" />
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">角色</label>
      <select class="form-select" id="editUserRole">
        <option value="系统管理员" ${u.role === '系统管理员' ? 'selected' : ''}>系统管理员</option>
        <option value="运维主管" ${u.role === '运维主管' ? 'selected' : ''}>运维主管</option>
        <option value="值班工程师" ${u.role === '值班工程师' ? 'selected' : ''}>值班工程师</option>
        <option value="业务分析师" ${u.role === '业务分析师' ? 'selected' : ''}>业务分析师</option>
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="saveEditUser('${id}')">保存</button>
    </div>
  `);
};

window.saveEditUser = (id) => {
  const u = window.DB.users.find(x => x.id === id);
  const name = document.getElementById('editUserName').value;
  const phone = document.getElementById('editUserPhone').value;
  if (!name) { toast('请输入姓名', 'error'); return; }
  if (!phone) { toast('请输入手机号', 'error'); return; }
  const oldName = u.name;
  u.name = name;
  u.phone = document.getElementById('editUserPhone').value;
  u.account = u.phone;
  u.email = document.getElementById('editUserEmail').value;
  u.dept = document.getElementById('editUserDept').value;
  u.role = document.getElementById('editUserRole').value;
  // 同步更新工单责任人（姓名变更时）
  if (oldName !== name) {
    window.DB.tickets.forEach(t => { if (t.assignee === oldName) t.assignee = name; });
    window.DB.schedules.forEach(s => { if (s.name === oldName) s.name = name; });
  }
  closeModal();
  toast('人员信息已更新，工单责任人已同步');
  window.DB._save();
  renderUsers();
};

window.toggleUser = (id) => {
  const u = window.DB.users.find(x => x.id === id);
  u.status = u.status === 'active' ? 'disabled' : 'active';
  toast(`${u.name} 已${u.status === 'active' ? '启用' : '禁用'}`);
  window.DB._save();
  renderUsers();
};

const PAGE_ITEMS = [
  { id: 'dashboard', label: '工作台' },
  { id: 'streams', label: '推流管理' },
  { id: 'detection', label: '检测项目' },
  { id: 'alerts', label: '告警中心' },
  { id: 'tickets', label: '工单分发' },
  { id: 'users', label: '人员权限' },
  { id: 'system', label: '系统管理' },
];

window.showAddRole = () => {
  modal(html`
    <div class="modal-title">创建自定义角色</div>
    <div class="form-group">
      <label class="form-label">角色名称</label>
      <input class="form-input" placeholder="如：巡检员" id="addRoleName" />
    </div>
    <div class="form-group">
      <label class="form-label">可访问的子页面</label>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">
        ${PAGE_ITEMS.map(p => html`
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--text-secondary);cursor:pointer">
            <input type="checkbox" data-page="${p.id}" checked /> ${p.label}
          </label>
        `).join('')}
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="saveAddRole()">创建</button>
    </div>
  `);
};

window.saveAddRole = () => {
  const name = document.getElementById('addRoleName').value;
  if (!name) { toast('请输入角色名称', 'error'); return; }
  const checks = document.querySelectorAll('#modalContent input[type="checkbox"]');
  const selected = [];
  checks.forEach((c) => { if (c.checked) selected.push(c.dataset.page); });
  window.DB.roles.push({
    id: 'R' + String(window.DB.roles.length + 1).padStart(3,'0'),
    name, preset: false, perms: selected.length > 0 ? selected : ['none'],
  });
  closeModal();
  window.DB._save();
  toast('角色创建成功');
  switchUserTab(document.querySelector('#userTabContent'), 'roles');
};

window.showEditRole = (id) => {
  const r = window.DB.roles.find(x => x.id === id);
  if (!r) return;
  modal(html`
    <div class="modal-title">编辑角色 — ${r.name}</div>
    <div class="form-group">
      <label class="form-label">角色名称</label>
      <input class="form-input" value="${r.name}" id="editRoleName" />
    </div>
    <div class="form-group">
      <label class="form-label">可访问的子页面</label>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">
        ${PAGE_ITEMS.map(p => html`
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--text-secondary);cursor:pointer">
            <input type="checkbox" data-page="${p.id}" ${r.perms.includes(p.id) ? 'checked' : ''} /> ${p.label}
          </label>
        `).join('')}
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="saveEditRole('${id}')">保存</button>
    </div>
  `);
};

window.saveEditRole = (id) => {
  const r = window.DB.roles.find(x => x.id === id);
  const name = document.getElementById('editRoleName').value;
  if (!name) { toast('请输入角色名称', 'error'); return; }
  const checks = document.querySelectorAll('#modalContent input[type="checkbox"]');
  const selected = [];
  checks.forEach((c) => { if (c.checked) selected.push(c.dataset.page); });
  r.name = name;
  r.perms = selected.length > 0 ? selected : ['none'];
  r.preset = false;
  closeModal();
  window.DB._save();
  toast('角色已更新，导航菜单已同步');
  switchUserTab(document.querySelector('#userTabContent'), 'roles');
  applyRolePermissions(); // 重新应用权限
};

// ===================== MISSING FUNCTION DEFINITIONS =====================

// ---- Core Navigation ----

function setPageContent(html) {
  document.getElementById('pageContainer').innerHTML = html;
}

function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });
  const pageItem = PAGE_ITEMS.find(p => p.id === page);
  if (pageItem) document.getElementById('pageTitle').textContent = pageItem.label;
  const renderers = {
    dashboard: renderDashboard,
    streams: renderStreams,
    detection: renderDetection,
    alerts: renderAlerts,
    tickets: () => renderTickets('list'),
    users: renderUsers,
    system: renderSystem,
  };
  (renderers[page] || renderDashboard)();
}
window.navigate = navigate;

function pingStream(id) {
  const s = window.DB.streams.find(x => x.id === id);
  if (!s) return;
  // 模拟 ping 检测：15% 概率切换在线/离线状态
  if (Math.random() < 0.15) {
    s.status = s.status === 'online' ? 'offline' : 'online';
  }
}
window.pingStream = pingStream;

// ---- Alerts Page ----

function renderAlerts() {
  const alertStatusMap = { pending: '待处理', confirmed: '已确认', ignored: '已忽略', false: '误报' };
  const typeStats = {};
  window.DB.alerts.forEach(a => { typeStats[a.type] = (typeStats[a.type] || 0) + 1; });

  setPageContent(html`
    <div class="filter-bar">
      <select class="form-select" id="alertTypeFilter" onchange="renderAlerts()">
        <option value="">全部类型</option>
        ${[...new Set(window.DB.alerts.map(a => a.type))].map(t => `<option value="${t}">${t}</option>`).join('')}
      </select>
      <select class="form-select" id="alertStatusFilter" onchange="renderAlerts()">
        <option value="">全部状态</option>
        <option value="pending">待处理</option>
        <option value="confirmed">已确认</option>
        <option value="ignored">已忽略</option>
        <option value="false">误报</option>
      </select>
      <button class="btn btn-primary btn-sm" onclick="batchCreateTicket()">合并创建工单</button>
      <span style="margin-left:auto;font-size:12px;color:var(--text-secondary)" id="alertSelectedCount">已选 0 项</span>
    </div>
    <div class="card">
      <div class="card-header">
        <span class="card-title">告警列表</span>
        <span style="font-size:12px;color:var(--text-secondary)">共 ${window.DB.alerts.length} 条</span>
      </div>
      <div class="card-body" style="padding:0">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th style="width:36px"><input type="checkbox" onchange="toggleAllAlerts(this.checked)" /></th>
                <th>告警ID</th>
                <th>视频流</th>
                <th>类型</th>
                <th>置信度</th>
                <th>状态</th>
                <th>时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              ${(() => {
                const typeFilter = document.getElementById('alertTypeFilter')?.value || '';
                const statusFilter = document.getElementById('alertStatusFilter')?.value || '';
                return window.DB.alerts.filter(a => {
                  if (typeFilter && a.type !== typeFilter) return false;
                  if (statusFilter && a.status !== statusFilter) return false;
                  return true;
                }).map(a => html`
                  <tr>
                    <td><input type="checkbox" data-id="${a.id}" onchange="toggleAlert('${a.id}')" ${selectedAlerts.has(a.id) ? 'checked' : ''} /></td>
                    <td><strong>${a.id}</strong></td>
                    <td>${a.stream}</td>
                    <td><span class="badge badge-pending"><span class="badge-dot"></span>${a.type}</span></td>
                    <td><span style="color:${a.confidence >= 80 ? 'var(--danger)' : a.confidence >= 60 ? 'var(--warning)' : 'var(--text-secondary)'};font-weight:600">${a.confidence}%</span></td>
                    <td><span class="badge ${a.status === 'pending' ? 'badge-pending' : a.status === 'confirmed' ? 'badge-done' : a.status === 'ignored' ? 'badge-offline' : 'badge-error'}"><span class="badge-dot"></span>${alertStatusMap[a.status] || a.status}</span></td>
                    <td style="font-size:12px;color:var(--text-secondary)">${a.time}</td>
                    <td>
                      ${a.status === 'pending' ? html`
                        <button class="btn btn-success btn-xs" onclick="handleAlert('${a.id}','confirmed')">确认</button>
                        <button class="btn btn-outline btn-xs" onclick="handleAlert('${a.id}','ignored')">忽略</button>
                        <button class="btn btn-warning btn-xs" onclick="handleAlert('${a.id}','false')">误报</button>
                      ` : ''}
                      <button class="btn btn-outline btn-xs" onclick="showAlertImg()">截图</button>
                    </td>
                  </tr>
                `).join('');
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <div style="margin-top:16px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
      ${Object.entries(typeStats).map(([type, count]) => html`
        <div class="card" style="text-align:center;padding:16px">
          <div style="font-size:13px;color:var(--text-secondary)">${type}</div>
          <div style="font-size:24px;font-weight:800;color:var(--text);margin-top:4px">${count}</div>
        </div>
      `).join('')}
    </div>
  `);
}
window.renderAlerts = renderAlerts;

// ---- Tickets Page ----

function addTicketLog(ticketId, action) {
  const now = new Date();
  window.DB.ticketLogs.unshift({
    date: now.toISOString().slice(0, 10),
    shift: '当前班次',
    operator: '管理员',
    action: `${action} [${ticketId}]`,
    time: now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
  });
}
window.addTicketLog = addTicketLog;

function renderTickets(mode) {
  const statusMap = { pending_assign: '待分配', processing: '处理中', review: '待验收', closed: '已关闭' };
  const priorityMap = { high: '高', mid: '中', low: '低' };

  setPageContent(html`
    <div class="quick-actions" style="margin-bottom:16px">
      <button class="btn btn-primary" onclick="showCreateTicket()">＋ 创建工单</button>
      <button class="btn btn-outline" onclick="showTicketRules()">⚙️ 转单规则</button>
      <div style="margin-left:auto;display:flex;gap:4px;background:#f1f5f9;border-radius:6px;padding:2px">
        <button class="btn btn-sm ${mode === 'list' ? 'btn-primary' : 'btn-outline'}" style="border:none" onclick="currentTicketMode='list';renderTickets('list')">列表</button>
        <button class="btn btn-sm ${mode === 'kanban' ? 'btn-primary' : 'btn-outline'}" style="border:none" onclick="currentTicketMode='kanban';renderTickets('kanban')">看板</button>
      </div>
    </div>
  `);

  if (mode === 'kanban') {
    const columns = ['pending_assign', 'processing', 'review', 'closed'];
    const colLabels = { pending_assign: '待分配', processing: '处理中', review: '待验收', closed: '已关闭' };
    const container = document.getElementById('pageContainer');
    const kanbanHtml = html`
      <div class="kanban-grid">
        ${columns.map(col => {
          const items = window.DB.tickets.filter(t => t.status === col);
          return html`
            <div class="kanban-col">
              <div class="kanban-col-header">
                <span>${colLabels[col]}</span>
                <span class="kanban-col-count">${items.length}</span>
              </div>
              ${items.map(t => html`
                <div class="kanban-item" onclick="showTicketDetail('${t.id}')">
                  <div class="kanban-item-title">
                    <span class="badge badge-${t.priority === 'high' ? 'error' : t.priority === 'mid' ? 'pending' : 'low'}" style="font-size:10px;margin-right:6px">${priorityMap[t.priority]}</span>
                    ${t.title}
                  </div>
                  <div class="kanban-item-sub">${t.assignee} · ${t.sla}</div>
                </div>
              `).join('')}
            </div>
          `;
        }).join('')}
      </div>
    `;
    container.innerHTML += kanbanHtml;
  } else {
    const container = document.getElementById('pageContainer');
    const listHtml = html`
      <div class="card">
        <div class="card-header"><span class="card-title">工单列表</span></div>
        <div class="card-body" style="padding:0">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>工单ID</th>
                  <th>标题</th>
                  <th>优先级</th>
                  <th>状态</th>
                  <th>责任人</th>
                  <th>SLA</th>
                  <th>创建时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                ${window.DB.tickets.map(t => html`
                  <tr>
                    <td><strong>${t.id}</strong></td>
                    <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.title}</td>
                    <td><span class="badge badge-${t.priority === 'high' ? 'error' : t.priority === 'mid' ? 'pending' : 'low'}">${priorityMap[t.priority]}</span></td>
                    <td><span class="badge ${t.status === 'pending_assign' ? 'badge-pending' : t.status === 'processing' ? 'badge-online' : t.status === 'review' ? 'badge-done' : 'badge-low'}">${statusMap[t.status]}</span></td>
                    <td>${t.assignee}</td>
                    <td style="font-size:12px;color:${t.sla === '已完成' ? 'var(--success)' : 'var(--text-secondary)'}">${t.sla}</td>
                    <td style="font-size:12px;color:var(--text-secondary)">${t.createdAt}</td>
                    <td>
                      <button class="btn btn-outline btn-xs" onclick="showTicketDetail('${t.id}')">详情</button>
                      ${t.status === 'pending_assign' ? `<button class="btn btn-primary btn-xs" onclick="assignTicket('${t.id}')">分配</button>` : ''}
                      ${t.status === 'processing' ? `<button class="btn btn-success btn-xs" onclick="submitTicketReview('${t.id}')">提交</button>` : ''}
                      ${t.status === 'review' ? `<button class="btn btn-success btn-xs" onclick="approveTicket('${t.id}')">验收</button><button class="btn btn-warning btn-xs" onclick="rejectTicket('${t.id}')">驳回</button>` : ''}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
    container.innerHTML += listHtml;
  }
}
window.renderTickets = renderTickets;

// ---- Users Page ----

function flattenDepts(depts, prefix = '') {
  const result = [];
  depts.forEach(d => {
    const name = prefix ? prefix + ' - ' + d.name : d.name;
    result.push(name);
    if (d.children && d.children.length > 0) {
      result.push(...flattenDepts(d.children, name));
    }
  });
  return result;
}

function renderUsers() {
  setPageContent(html`
    <div class="tabs" id="userTabContent">
      <span class="tab active" data-tab="users" onclick="switchUserTab(this.parentElement, 'users')">人员管理</span>
      <span class="tab" data-tab="roles" onclick="switchUserTab(this.parentElement, 'roles')">角色权限</span>
      <span class="tab" data-tab="schedule" onclick="switchUserTab(this.parentElement, 'schedule')">排班日历</span>
    </div>
    <div id="userPageContent"></div>
  `);
  switchUserTab(document.getElementById('userTabContent'), 'users');
}
window.renderUsers = renderUsers;

function switchUserTab(container, tab) {
  container.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  const content = document.getElementById('userPageContent');
  if (tab === 'users') {
    content.innerHTML = html`
      <div class="quick-actions" style="margin-bottom:16px">
        <button class="btn btn-primary" onclick="showAddUser()">＋ 添加人员</button>
        <button class="btn btn-outline" onclick="exportAddressBook()">📥 导出通讯录</button>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">人员列表</span></div>
        <div class="card-body" style="padding:0">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>姓名</th>
                  <th>账号</th>
                  <th>所属部门</th>
                  <th>角色</th>
                  <th>手机号</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                ${window.DB.users.map(u => html`
                  <tr>
                    <td><strong>${u.name}</strong></td>
                    <td>${u.account}</td>
                    <td>${u.dept}</td>
                    <td>${u.role}</td>
                    <td>${u.phone}</td>
                    <td><span class="badge ${u.status === 'active' ? 'badge-online' : 'badge-offline'}"><span class="badge-dot"></span>${u.status === 'active' ? '启用' : '禁用'}</span></td>
                    <td>
                      <button class="btn btn-outline btn-xs" onclick="showEditUser('${u.id}')">编辑</button>
                      <button class="btn btn-${u.status === 'active' ? 'warning' : 'success'} btn-xs" onclick="toggleUser('${u.id}')">${u.status === 'active' ? '禁用' : '启用'}</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  } else if (tab === 'roles') {
    content.innerHTML = html`
      <div class="quick-actions" style="margin-bottom:16px">
        <button class="btn btn-primary" onclick="showAddRole()">＋ 创建角色</button>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">角色列表</span></div>
        <div class="card-body" style="padding:0">
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>角色名称</th><th>类型</th><th>可访问页面</th><th>操作</th></tr>
              </thead>
              <tbody>
                ${window.DB.roles.map(r => html`
                  <tr>
                    <td><strong>${r.name}</strong></td>
                    <td>${r.preset ? '预设' : '自定义'}</td>
                    <td style="font-size:12px;color:var(--text-secondary)">${r.perms.map(p => PAGE_ITEMS.find(i => i.id === p)?.label || p).join('、')}</td>
                    <td><button class="btn btn-outline btn-xs" onclick="showEditRole('${r.id}')">编辑</button></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  } else if (tab === 'schedule') {
    renderScheduleCalendar(content);
  }
}
window.switchUserTab = switchUserTab;

function renderOrgTree(depts) {
  return depts.map(d => html`
    <div class="org-node">
      <div class="org-node-header" onclick="toggleOrgChildren(this)">
        ${d.children && d.children.length > 0 ? '<span class="org-toggle">▾</span>' : '<span class="org-toggle" style="visibility:hidden">▸</span>'}
        <span>${d.name}</span>
      </div>
      ${d.children && d.children.length > 0 ? html`<div class="org-children">${renderOrgTree(d.children)}</div>` : ''}
    </div>
  `).join('');
}

function renderScheduleCalendar(container) {
  const now = new Date();
  const year = scheduleYear || now.getFullYear();
  const month = scheduleMonth !== undefined ? scheduleMonth : now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthNames = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];

  container.innerHTML = html`
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <button class="btn btn-outline btn-sm" onclick="changeScheduleMonth(-1)">‹ 上月</button>
      <span style="font-size:16px;font-weight:700;color:var(--text)">${year}年 ${monthNames[month]}</span>
      <button class="btn btn-outline btn-sm" onclick="changeScheduleMonth(1)">下月 ›</button>
      <span style="margin-left:auto;font-size:12px;color:var(--text-secondary)">早班 08-16 · 中班 16-00 · 夜班 00-08</span>
    </div>
    <div class="calendar-grid">
      ${['日','一','二','三','四','五','六'].map(d => `<div class="calendar-header">${d}</div>`).join('')}
      ${Array.from({length: firstDay}, () => '<div class="calendar-day other-month"></div>').join('')}
      ${Array.from({length: daysInMonth}, (_, i) => {
        const date = i + 1;
        const daySchedules = window.DB.schedules.filter(s => s.year === year && s.month === month + 1 && s.date === date);
        const isToday = now.getFullYear() === year && now.getMonth() === month && now.getDate() === date;
        return html`
          <div class="calendar-day ${isToday ? 'today' : ''}">
            <div>${date}</div>
            ${daySchedules.map(s => `<div class="shift shift-${s.shift.includes('早') ? 'morning' : s.shift.includes('中') ? 'afternoon' : 'night'}">${s.name}</div>`).join('')}
          </div>
        `;
      }).join('')}
    </div>
    <div class="card" style="margin-top:16px">
      <div class="card-header"><span class="card-title">值班人员</span><span class="card-title" style="font-weight:400;font-size:13px">当前值班：${window.DB.schedules.filter(s => s.year === now.getFullYear() && s.month === now.getMonth() + 1 && s.date === now.getDate()).map(s => s.name).join('、') || '无'}</span></div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px">
          ${window.DB.users.filter(u => u.status === 'active').map(u => html`
            <div style="display:flex;align-items:center;gap:10px;padding:8px;border:1px solid var(--border);border-radius:6px">
              <div class="user-avatar" style="width:28px;height:28px;font-size:12px">${u.name[0]}</div>
              <div>
                <div style="font-size:13px;font-weight:600;color:var(--text)">${u.name}</div>
                <div style="font-size:11px;color:var(--text-secondary)">${u.role} · ${u.dept}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

window.changeScheduleMonth = (delta) => {
  const now = new Date();
  const year = scheduleYear || now.getFullYear();
  const month = scheduleMonth !== undefined ? scheduleMonth : now.getMonth();
  const newDate = new Date(year, month + delta, 1);
  scheduleYear = newDate.getFullYear();
  scheduleMonth = newDate.getMonth();
  renderUsers();
  // 切换到排班 tab
  const tabContainer = document.querySelector('#userTabContent');
  if (tabContainer) switchUserTab(tabContainer, 'schedule');
};

// ---- System Page ----

function renderSystem() {
  setPageContent(html`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="card">
        <div class="card-header"><span class="card-title">大模型接口配置</span></div>
        <div class="card-body">
          ${window.DB.apiModels.map((m) => html`
            <div style="margin-bottom:16px;padding:14px;border:1px solid var(--border);border-radius:8px;background:#f8fafc">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                <span style="font-size:14px;font-weight:700;color:var(--text)">${m.name}</span>
                <span class="badge ${m.isDefault ? 'badge-online' : 'badge-offline'}">${m.isDefault ? '默认' : '备用'}</span>
                <span style="font-size:12px;color:var(--text-secondary);margin-left:auto">${m.provider}</span>
              </div>
              <div class="form-group" style="margin-bottom:8px">
                <label class="form-label">接口地址</label>
                <input class="form-input" value="${m.apiUrl}" readonly style="font-size:12px;font-family:monospace" />
              </div>
              <div class="form-group" style="margin-bottom:0">
                <label class="form-label">API Key</label>
                <input class="form-input" type="password" value="${m.apiKey || '********'}" placeholder="未配置" readonly />
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      <div>
        <div class="card" style="margin-bottom:16px">
          <div class="card-header"><span class="card-title">系统设置</span></div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">日志保留天数</label>
              <input class="form-input" type="number" id="configLogRetention" value="${window.DB.config.logRetentionDays}" />
            </div>
            <div class="form-group">
              <label class="form-label">截留存留天数</label>
              <input class="form-input" type="number" id="configScreenshotRetention" value="${window.DB.config.screenshotRetentionDays}" />
            </div>
            <div class="form-group">
              <label class="form-label">WebSocket 心跳间隔（秒）</label>
              <input class="form-input" type="number" id="configHeartbeat" value="${window.DB.config.websocketHeartbeat}" />
            </div>
            <div class="form-group">
              <label class="form-label">全局灵敏度：<span id="configSensitivityValue">${window.DB.config.globalSensitivity}</span></label>
              <input type="range" min="0.1" max="0.9" step="0.05" id="configSensitivity" value="${window.DB.config.globalSensitivity}" oninput="document.getElementById('configSensitivityValue').textContent=this.value" style="width:100%;accent-color:var(--primary)" />
            </div>
            <button class="btn btn-primary" onclick="window.saveSystemConfig()">保存设置</button>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">操作日志</span></div>
          <div class="card-body" style="padding:0">
            <div class="table-wrap" style="max-height:300px;overflow-y:auto">
              <table>
                <thead>
                  <tr><th>时间</th><th>班次</th><th>操作人</th><th>操作内容</th></tr>
                </thead>
                <tbody>
                  ${window.DB.ticketLogs.slice(0, 20).map(log => html`
                    <tr>
                      <td style="font-size:12px;color:var(--text-secondary)">${log.date} ${log.time}</td>
                      <td>${log.shift}</td>
                      <td>${log.operator}</td>
                      <td style="font-size:12px">${log.action}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `);
}
window.renderSystem = renderSystem;

window.saveSystemConfig = () => {
  window.DB.config.logRetentionDays = parseInt(document.getElementById('configLogRetention').value) || 90;
  window.DB.config.screenshotRetentionDays = parseInt(document.getElementById('configScreenshotRetention').value) || 7;
  window.DB.config.websocketHeartbeat = parseInt(document.getElementById('configHeartbeat').value) || 30;
  window.DB.config.globalSensitivity = parseFloat(document.getElementById('configSensitivity').value) || 0.65;
  window.DB._save();
  toast('系统配置已保存');
};

// ---- Data Cleanup ----

function runDataCleanup() {
  const retention = window.DB.config.logRetentionDays || 90;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retention);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  window.DB.ticketLogs = window.DB.ticketLogs.filter(log => log.date >= cutoffStr);
  if (window.DB.alerts.length > 200) window.DB.alerts.length = 200;
  window.DB._save();
}
window.runDataCleanup = runDataCleanup;

// ---- Stream CRUD ----

function toggleAllStreams(checked) {
  if (checked) window.DB.streams.forEach(s => selectedStreams.add(s.id));
  else selectedStreams.clear();
  renderStreams();
}
window.toggleAllStreams = toggleAllStreams;

function toggleStream(id) {
  if (selectedStreams.has(id)) selectedStreams.delete(id);
  else selectedStreams.add(id);
  updateStreamSelectedCount();
}
window.toggleStream = toggleStream;

function updateStreamSelectedCount() {
  const el = document.getElementById('streamSelectedCount');
  if (el) el.textContent = `已选 ${selectedStreams.size} 项`;
}
window.updateStreamSelectedCount = updateStreamSelectedCount;

function batchStreamAction(action) {
  if (selectedStreams.size === 0) { toast('请先选择视频流', 'error'); return; }
  const actionNames = { enable: '启用', disable: '停用', delete: '删除' };
  if (action === 'delete' && !confirm(`确认删除 ${selectedStreams.size} 条视频流？`)) return;
  selectedStreams.forEach(id => {
    const s = window.DB.streams.find(x => x.id === id);
    if (!s) return;
    if (action === 'enable') s.status = 'online';
    else if (action === 'disable') s.status = 'offline';
    else if (action === 'delete') {
      const s = window.DB.streams.find(x => x.id === id);
      if (s) {
        window.DB.detections = window.DB.detections.filter(d => d.stream !== s.name);
        window.DB.alerts = window.DB.alerts.filter(a => a.stream !== s.name);
      }
      window.DB.streams = window.DB.streams.filter(x => x.id !== id);
    }
  });
  selectedStreams.clear();
  window.DB._save();
  toast(`批量${actionNames[action]}成功`);
  renderStreams();
}
window.batchStreamAction = batchStreamAction;

function showAddStream() {
  modal(html`
    <div class="modal-title">新增推流</div>
    <div class="form-group">
      <label class="form-label">流名称 *</label>
      <input class="form-input" placeholder="如：园区东门" id="addStreamName" />
    </div>
    <div class="form-group">
      <label class="form-label">推流地址 *</label>
      <input class="form-input" placeholder="rtsp://..." id="addStreamAddr" />
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">协议</label>
        <select class="form-select" id="addStreamProtocol">
          <option>RTSP</option><option>RTMP</option><option>HTTP-FLV</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">分辨率</label>
        <select class="form-select" id="addStreamRes">
          <option>1080P</option><option>720P</option><option>4K</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">帧率</label>
      <input class="form-input" type="number" value="25" id="addStreamFps" />
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="saveStream()">创建</button>
    </div>
  `);
}
window.showAddStream = showAddStream;

function saveStream() {
  const name = document.getElementById('addStreamName').value;
  const addr = document.getElementById('addStreamAddr').value;
  if (!name || !addr) { toast('请填写流名称和推流地址', 'error'); return; }
  window.DB.streams.push({
    id: 'S' + String(window.DB.streams.length + 1).padStart(3, '0'),
    name, addr,
    protocol: document.getElementById('addStreamProtocol').value,
    res: document.getElementById('addStreamRes').value,
    fps: parseInt(document.getElementById('addStreamFps').value) || 25,
    codec: 'H.264', status: 'online',
    createdAt: new Date().toLocaleString('zh-CN'),
  });
  closeModal();
  toast(`推流「${name}」创建成功`);
  window.DB._save();
  renderStreams();
}
window.saveStream = saveStream;

function editStream(id) {
  const s = window.DB.streams.find(x => x.id === id);
  if (!s) return;
  modal(html`
    <div class="modal-title">编辑推流 — ${s.name}</div>
    <div class="form-group">
      <label class="form-label">流名称</label>
      <input class="form-input" value="${s.name}" id="editStreamName" />
    </div>
    <div class="form-group">
      <label class="form-label">推流地址</label>
      <input class="form-input" value="${s.addr}" id="editStreamAddr" />
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="confirmEditStream('${id}')">保存</button>
    </div>
  `);
}
window.editStream = editStream;

function confirmEditStream(id) {
  const s = window.DB.streams.find(x => x.id === id);
  if (!s) return;
  s.name = document.getElementById('editStreamName').value || s.name;
  s.addr = document.getElementById('editStreamAddr').value || s.addr;
  closeModal();
  toast('推流信息已更新');
  window.DB._save();
  renderStreams();
}
window.confirmEditStream = confirmEditStream;

function deleteStream(id) {
  if (!confirm('确认删除该视频流？')) return;
  const s = window.DB.streams.find(x => x.id === id);
  if (!s) return;
  // 级联清理关联的检测项目和告警
  window.DB.detections = window.DB.detections.filter(d => d.stream !== s.name);
  window.DB.alerts = window.DB.alerts.filter(a => a.stream !== s.name);
  window.DB.streams = window.DB.streams.filter(x => x.id !== id);
  toast('推流已删除，关联检测项目和告警已清理');
  window.DB._save();
  renderStreams();
}
window.deleteStream = deleteStream;

// ---- Detection CRUD ----

function showAddDetection() {
  modal(html`
    <div class="modal-title">创建检测项目</div>
    <div class="form-group">
      <label class="form-label">项目名称 *</label>
      <input class="form-input" placeholder="如：周界入侵检测" id="addDetName" />
    </div>
    <div class="form-group">
      <label class="form-label">关联视频流</label>
      <select class="form-select" id="addDetStream">
        ${window.DB.streams.map(s => `<option value="${s.name}">${s.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">算法类型</label>
      <select class="form-select" id="addDetAlgo">
        ${window.DB.algoTypes.map(a => `<option value="${typeof a === 'string' ? a : a.name}">${typeof a === 'string' ? a : a.name}</option>`).join('')}
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="confirmAddDetection()">创建</button>
    </div>
  `);
}
window.showAddDetection = showAddDetection;

function confirmAddDetection() {
  const name = document.getElementById('addDetName').value;
  if (!name) { toast('请输入检测项目名称', 'error'); return; }
  window.DB.detections.push({
    id: 'D' + String(window.DB.detections.length + 1).padStart(3, '0'),
    name, stream: document.getElementById('addDetStream').value,
    algo: document.getElementById('addDetAlgo').value,
    roi: '矩形', sensitivity: 0.65, status: 'running',
    createdAt: new Date().toLocaleString('zh-CN'),
  });
  closeModal();
  toast('检测项目创建成功');
  window.DB._save();
  renderDetection();
}
window.confirmAddDetection = confirmAddDetection;

function toggleDetection(id) {
  const d = window.DB.detections.find(x => x.id === id);
  if (!d) return;
  d.status = d.status === 'running' ? 'stopped' : 'running';
  toast(`检测项目「${d.name}」已${d.status === 'running' ? '启动' : '停止'}`);
  window.DB._save();
  renderDetection();
}
window.toggleDetection = toggleDetection;

function editDetection(id) {
  const d = window.DB.detections.find(x => x.id === id);
  if (!d) return;
  modal(html`
    <div class="modal-title">检测配置 — ${d.name}</div>
    <div class="form-group">
      <label class="form-label">灵敏度</label>
      <input type="range" min="0.1" max="0.9" step="0.05" value="${d.sensitivity}" id="editDetSensitivity" oninput="this.nextElementSibling.textContent=this.value" style="width:100%;accent-color:var(--primary)" />
      <span style="font-size:13px;font-weight:600;color:var(--text)">${d.sensitivity}</span>
    </div>
    <div class="form-group">
      <label class="form-label">ROI 坐标配置</label>
      <textarea class="form-input" rows="4" id="editDetRoi" style="font-family:monospace;font-size:12px">${d.roi}</textarea>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="confirmEditDetection('${d.id}')">保存</button>
    </div>
  `);
}
window.editDetection = editDetection;

window.confirmEditDetection = (id) => {
  const d = window.DB.detections.find(x => x.id === id);
  if (!d) return;
  d.sensitivity = parseFloat(document.getElementById('editDetSensitivity').value) || d.sensitivity;
  d.roi = document.getElementById('editDetRoi').value || d.roi;
  closeModal();
  window.DB._save();
  toast('检测配置已保存');
  renderDetection();
};

// ---- Role Permissions ----

function applyRolePermissions() {
  // 查找当前用户角色，按权限控制导航显示
  const currentUser = window.DB.users.find(u => u.name === '管理员');
  if (!currentUser) return;
  const role = window.DB.roles.find(r => r.name === currentUser.role);
  if (!role) return;
  document.querySelectorAll('.nav-item').forEach(item => {
    const page = item.dataset.page;
    item.style.display = role.perms.includes(page) ? '' : 'none';
  });
}
window.applyRolePermissions = applyRolePermissions;

// ===================== SIMULATED REALTIME =====================

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

  // Update alert stream if on dashboard — 刷新整个工作台以展示按流分组的告警
  if (currentPage === 'dashboard') {
    renderDashboard();
  }

  // Update nav badges
  updateNavBadges();

  // 新告警到达时点亮通知红点
  const notifDot = document.querySelector('.notif-dot');
  if (notifDot) notifDot.style.display = 'block';

  // Auto-create ticket for high confidence
  if (conf >= 80) {
    setTimeout(() => {
      const ticketId = 'WO-' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '-' + String(window.DB.tickets.length + 1).padStart(5,'0');
      const ticketTitle = `${s.name} ${type}告警`;
      window.DB.tickets.unshift({
        id: ticketId,
        title: ticketTitle,
        priority: 'high', status: 'pending_assign', assignee: '-',
        alerts: [alert.id], sla: '-', createdAt: new Date().toLocaleString('zh-CN'),
        desc: '', photos: [],
      });
      // 保存并更新 badge
      window.DB._save();
      updateNavBadges();
      // 如果当前在告警页面，实时追加新告警到表格
      if (currentPage === 'alerts') renderAlerts();
      if (currentPage === 'tickets') renderTickets(currentTicketMode);
      addTicketLog(ticketId, `自动创建 ${ticketTitle}`);
      toast(`高置信告警自动创建工单: ${ticketId}`, 'info');
    }, 2000);
  }
}

// ===================== INIT =====================

function updateNavBadges() {
  const pendingAlerts = window.DB.alerts.filter(a => a.status === 'pending').length;
  const activeTickets = window.DB.tickets.filter(t => t.status === 'pending_assign' || t.status === 'processing').length;
  const aBadge = document.querySelector('[data-page="alerts"] .nav-badge');
  const tBadge = document.querySelector('[data-page="tickets"] .nav-badge');
  if (aBadge) aBadge.textContent = pendingAlerts;
  if (tBadge) tBadge.textContent = activeTickets;
}
window.updateNavBadges = updateNavBadges;

document.addEventListener('DOMContentLoaded', () => {
  // Sidebar navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(item.dataset.page);
      // Close sidebar on mobile
      document.getElementById('sidebar').classList.remove('open');
    });
  });

  // Notification bell
  document.getElementById('notifBtn').addEventListener('click', () => {
    const pending = window.DB.alerts.filter(a => a.status === 'pending');
    modal(html`
      <div class="modal-title">通知消息</div>
      <div style="margin-bottom:12px;font-size:13px;color:var(--text-secondary)">您有 ${pending.length} 条待处理告警</div>
      ${pending.slice(0, 5).map(a => html`
        <div style="padding:8px 0;border-bottom:1px solid var(--border);font-size:13px">
          <strong>${a.type}</strong> @ ${a.stream}
          <span style="color:var(--text-secondary);float:right">${a.time}</span>
        </div>
      `).join('')}
      ${pending.length > 5 ? html`<div style="padding:8px 0;font-size:12px;color:var(--text-secondary)">...还有 ${pending.length - 5} 条</div>` : ''}
      ${pending.length === 0 ? html`<div style="padding:20px;text-align:center;font-size:13px;color:var(--text-secondary)">暂无新通知</div>` : ''}
      <div class="modal-actions"><button class="btn btn-outline" onclick="closeModal()">关闭</button></div>
    `);
    // 点击后消除红点
    const dot = document.querySelector('.notif-dot');
    if (dot) dot.style.display = pending.length === 0 ? 'none' : 'block';
  });
  document.getElementById('sidebarToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Clock
  function updateTime() {
    document.getElementById('topbarTime').textContent = new Date().toLocaleString('zh-CN');
  }
  updateTime();
  setInterval(updateTime, 1000);

  // Simulate realtime alerts every 8-15s
  function scheduleSim() {
    const delay = 8000 + Math.random() * 7000;
    setTimeout(() => {
      simulateAlert();
      scheduleSim();
    }, delay);
  }
  setTimeout(scheduleSim, 5000);

  // 应用角色权限（控制导航菜单显示）
  applyRolePermissions();

  // 更新导航角标
  updateNavBadges();

  // 自动执行数据清理（启动时和每天一次）
  window.runDataCleanup();
  setInterval(() => window.runDataCleanup(), 24 * 60 * 60 * 1000);

  // Render default page
  navigate('dashboard');
});
