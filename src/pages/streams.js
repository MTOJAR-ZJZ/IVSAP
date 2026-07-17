/* ========================================
   Stream Analyzer — Streams Page
   推流管理
   ======================================== */

let selectedStreams = new Set();

function renderStreams() {
  window.setPageContent(html`
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
                <th>源地址</th>
                <th>截图间隔</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              ${window.DB.streams.map(s => html`
                <tr>
                  <td><input type="checkbox" data-id="${s.id}" onchange="toggleStream('${s.id}')" ${selectedStreams.has(s.id) ? 'checked' : ''} /></td>
                  <td><strong>${s.name}</strong></td>
                  <td style="font-size:12px;color:var(--text-secondary);max-width:200px;overflow:hidden;text-overflow:ellipsis">${s.addr || '-'}</td>
                  <td><span class="badge badge-info" style="font-size:11px;background:#eff6ff;color:var(--info);border:1px solid #bfdbfe">${s.captureInterval || 5}s/次</span></td>
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
  setTimeout(() => { window.DB.streams.forEach(s => pingStream(s.id)); }, 500);
  updateStreamSelectedCount();
}
window.renderStreams = renderStreams;

function pingStream(id) {
  const s = window.DB.streams.find(x => x.id === id);
  if (!s) return;
  if (Math.random() < 0.15) {
    s.status = s.status === 'online' ? 'offline' : 'online';
  }
}
window.pingStream = pingStream;

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
      window.DB.detections = window.DB.detections.filter(d => d.stream !== s.name);
      window.DB.alerts = window.DB.alerts.filter(a => a.stream !== s.name);
      window.DB.streams = window.DB.streams.filter(x => x.id !== id);
    }
  });
  const batchIds = [...selectedStreams];
  selectedStreams.clear();
  if (window.API_SAVE) window.API_SAVE.batchStreamAction(batchIds, action).catch(e => console.warn('[API]', e.message));
  window.DB._save();
  toast(`批量${actionNames[action]}成功`);
  renderStreams();
}
window.batchStreamAction = batchStreamAction;

function showAddStream() {
  window.modal(html`
    <div class="modal-title">新增推流</div>
    <div class="form-group">
      <label class="form-label">流名称 *</label>
      <input class="form-input" placeholder="如：园区东门" id="addStreamName" />
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
    <div class="form-group">
      <label class="form-label">截图间隔（秒）</label>
      <input class="form-input" type="number" value="5" min="1" max="3600" id="addStreamCaptureInterval" />
      <div style="font-size:11px;color:var(--text-secondary);margin-top:4px">每隔 N 秒截取一帧画面用于 AI 检测分析</div>
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
  if (!name) { toast('请输入流名称', 'error'); return; }
  window.DB.streams.push({
    id: 'S' + String(window.DB.streams.length + 1).padStart(3, '0'),
    name, addr: '',
    playUrl: '',
    protocol: '',
    res: document.getElementById('addStreamRes').value,
    fps: parseInt(document.getElementById('addStreamFps').value) || 25,
    captureInterval: parseInt(document.getElementById('addStreamCaptureInterval').value) || 5,
    codec: 'H.264', status: 'online',
    createdAt: new Date().toLocaleString('zh-CN'),
  });
  closeModal();
  toast(`推流「${name}」创建成功`);
  if (window.API_SAVE) window.API_SAVE.stream({ name, addr: '', playUrl: '', protocol: '', res: document.getElementById('addStreamRes').value, fps: parseInt(document.getElementById('addStreamFps').value) || 25, captureInterval: parseInt(document.getElementById('addStreamCaptureInterval').value) || 5, codec: 'H.264', status: 'online' }).catch(e => console.warn('[API]', e.message));
  window.DB._save();
  renderStreams();
}
window.saveStream = saveStream;

function editStream(id) {
  const s = window.DB.streams.find(x => x.id === id);
  if (!s) return;
  window.modal(html`
    <div class="modal-title">编辑推流 — ${s.name}</div>
    <div class="form-group">
      <label class="form-label">流名称</label>
      <input class="form-input" value="${s.name}" id="editStreamName" />
    </div>
    <div class="form-group">
      <label class="form-label">截图间隔（秒）</label>
      <input class="form-input" type="number" value="${s.captureInterval || 5}" min="1" max="3600" id="editStreamCaptureInterval" />
      <div style="font-size:11px;color:var(--text-secondary);margin-top:4px">每隔 N 秒截取一帧画面用于 AI 检测分析</div>
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
  s.addr = document.getElementById('editStreamAddr').value || '';
  s.captureInterval = parseInt(document.getElementById('editStreamCaptureInterval').value) || 5;
  closeModal();
  toast('推流信息已更新');
  if (window.API_SAVE) window.API_SAVE.updateStream(id, s).catch(e => console.warn('[API]', e.message));
  window.DB._save();
  renderStreams();
}
window.confirmEditStream = confirmEditStream;

function deleteStream(id) {
  if (!confirm('确认删除该视频流？')) return;
  const s = window.DB.streams.find(x => x.id === id);
  if (!s) return;
  window.DB.detections = window.DB.detections.filter(d => d.stream !== s.name);
  window.DB.alerts = window.DB.alerts.filter(a => a.stream !== s.name);
  window.DB.streams = window.DB.streams.filter(x => x.id !== id);
  toast('推流已删除，关联检测项目和告警已清理');
  if (window.API_SAVE) window.API_SAVE.deleteStream(id).catch(e => console.warn('[API]', e.message));
  window.DB._save();
  renderStreams();
}
window.deleteStream = deleteStream;
