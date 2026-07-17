/* ========================================
   Stream Analyzer — Alerts Page
   告警中心
   ======================================== */

let selectedAlerts = new Set();

function renderAlerts() {
  const alertStatusMap = { pending: '待处理', confirmed: '已确认', ignored: '已忽略', false: '误报' };
  const typeStats = {};
  window.DB.alerts.forEach(a => { typeStats[a.type] = (typeStats[a.type] || 0) + 1; });

  window.setPageContent(html`
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

// ===================== ALERT HANDLERS =====================

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
  window.modal(html`
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
  selectedAlertList.forEach(a => { a.status = 'confirmed'; a.note = `已合并为工单 ${ticketId}`; });
  selectedAlerts.clear();
  window.DB._save();
  toast(`合并创建工单成功：${title}`);
  navigate('tickets');
};
