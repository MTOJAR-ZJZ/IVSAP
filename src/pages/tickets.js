/* ========================================
   Stream Analyzer — Tickets Page
   工单分发
   ======================================== */

let selectedTickets = new Set();

// ===================== TICKET LOG =====================

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

// ===================== TICKETS PAGE RENDERER =====================

function renderTickets(mode) {
  const statusMap = { pending_assign: '待分配', processing: '处理中', review: '待验收', closed: '已关闭' };
  const priorityMap = { high: '高', mid: '中', low: '低' };

  window.setPageContent(html`
    <div class="quick-actions" style="margin-bottom:16px">
      <button class="btn btn-primary" onclick="showCreateTicket()">＋ 创建工单</button>
      <button class="btn btn-outline" onclick="showTicketRules()">⚙️ 转单规则</button>
      <div style="margin-left:auto;display:flex;gap:4px;background:#f1f5f9;border-radius:6px;padding:2px">
        <button class="btn btn-sm ${mode === 'list' ? 'btn-primary' : 'btn-outline'}" style="border:none" onclick="window.AppState.currentTicketMode='list';renderTickets('list')">列表</button>
        <button class="btn btn-sm ${mode === 'kanban' ? 'btn-primary' : 'btn-outline'}" style="border:none" onclick="window.AppState.currentTicketMode='kanban';renderTickets('kanban')">看板</button>
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
                    ${escapeHtml(t.title)}
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
                  <th>工单处理时限</th>
                  <th>创建时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                ${window.DB.tickets.map(t => html`
                  <tr>
                    <td><strong>${t.id}</strong></td>
                    <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(t.title)}</td>
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

  const container = document.getElementById('pageContainer');
  const logHtml = html`
    <div class="card" style="margin-top:16px">
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
  `;
  container.innerHTML += logHtml;
}
window.renderTickets = renderTickets;

// ===================== TICKET CRUD =====================

window.showCreateTicket = () => {
  window.modal(html`
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
  if (window.API_SAVE) window.API_SAVE.createTicket({ id: ticketId, title, priority: document.getElementById('ticketPriority').value, status: 'pending_assign', assignee: '-', alerts: document.getElementById('ticketAlert').value ? [document.getElementById('ticketAlert').value] : [], sla: '-', createdAt: new Date().toLocaleString('zh-CN'), desc: document.getElementById('ticketDesc').value || '', photos: [] }).catch(e => console.warn('[API]', e.message));
  window.DB._save();
  renderTickets('list');
  updateNavBadges();
};

window.showTicketDetail = (id) => {
  const t = window.DB.tickets.find(x => x.id === id);
  const statusMap = { pending_assign: '待分配', processing: '处理中', review: '待验收', closed: '已关闭' };
  window.modal(html`
    <div class="modal-title">工单详情 — ${t.id}</div>
    <div style="margin-bottom:16px">
      <div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:8px">${escapeHtml(t.title)}</div>
      <div style="display:flex;gap:12px;font-size:13px;color:var(--text-secondary)">
        <span>状态：<strong>${statusMap[t.status]}</strong></span>
        <span>责任人：<strong>${t.assignee}</strong></span>
        <span>工单处理时限：<strong>${t.sla}</strong></span>
      </div>
    </div>
    <div style="background:rgba(255,255,255,.03);padding:14px;border-radius:8px;margin-bottom:12px">
      <div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px">处置记录</div>
      ${t.desc ? html`<div style="font-size:13px">${escapeHtml(t.desc)}</div>` : html`<div style="font-size:13px;color:var(--text-secondary)">暂无处置记录</div>`}
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
  window.modal(html`
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
  if (window.API_SAVE) window.API_SAVE.assignTicket(id, user).catch(e => console.warn('[API]', e.message));
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
  if (window.API_SAVE) window.API_SAVE.updateTicketStatus(id, t.status, t.desc).catch(e => console.warn('[API]', e.message));
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
  if (window.API_SAVE) window.API_SAVE.updateTicketStatus(id, 'review', t.desc).catch(e => console.warn('[API]', e.message));
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
  if (window.API_SAVE) window.API_SAVE.updateTicketStatus(id, 'closed', t.desc).catch(e => console.warn('[API]', e.message));
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
  if (window.API_SAVE) window.API_SAVE.updateTicketStatus(id, 'processing', t.desc).catch(e => console.warn('[API]', e.message));
  window.DB._save();
  renderTickets('list');
  updateNavBadges();
};

window.showTicketRules = () => {
  const rules = window.DB.config.ticketRules || { algoType: '全部', confidence: 80, hitCount: 3, assignStrategy: '按人员忙闲度' };
  window.modal(html`
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
  if (window.API_SAVE) window.API_SAVE.saveTicketRules(window.DB.config.ticketRules).catch(e => console.warn('[API]', e.message));
  window.DB._save();
  toast('规则保存成功', 'success');
};
