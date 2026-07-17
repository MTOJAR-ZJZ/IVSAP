/* ========================================
   Stream Analyzer — Detection Page
   检测项目管理
   ======================================== */

function renderDetection() {
  window.setPageContent(html`
    <div class="quick-actions" style="margin-bottom:16px">
      <button class="btn btn-primary" onclick="showAddDetection()">＋ 创建检测项目</button>
      <button class="btn btn-outline" onclick="navigate('algorithms')">🧠 算法管理</button>
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
                <th>数据类型</th>
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
                  <td><span class="badge badge-pending" style="font-size:11px">${d.dataType || '实时视频流'}</span></td>
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
window.renderDetection = renderDetection;

// ===================== DETECTION CRUD =====================

function showAddDetection() {
  window.modal(html`
    <div class="modal-title">创建检测项目</div>
    <div class="form-group">
      <label class="form-label">项目名称 *</label>
      <input class="form-input" placeholder="如：周界入侵检测" id="addDetName" />
    </div>
    <div class="form-group">
      <label class="form-label">数据类型</label>
      <select class="form-select" id="addDetDataType" onchange="toggleAddDetStream(this.value)">
        <option value="实时视频流">实时视频流</option>
        <option value="视频文件">视频文件</option>
        <option value="图片分析">图片分析</option>
        <option value="离线视频">离线视频</option>
      </select>
    </div>
    <div class="form-group" id="addDetStreamGroup">
      <label class="form-label">关联视频流</label>
      <select class="form-select" id="addDetStream">
        ${window.DB.streams.map(s => `<option value="${s.name}">${s.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-group" id="addDetFileGroup" style="display:none">
      <label class="form-label">文件路径/URL</label>
      <input class="form-input" placeholder="输入视频文件路径或 URL" id="addDetFileUrl" />
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

window.toggleAddDetStream = (dataType) => {
  const streamGroup = document.getElementById('addDetStreamGroup');
  const fileGroup = document.getElementById('addDetFileGroup');
  if (dataType === '实时视频流') {
    streamGroup.style.display = '';
    fileGroup.style.display = 'none';
  } else {
    streamGroup.style.display = 'none';
    fileGroup.style.display = '';
  }
};

function confirmAddDetection() {
  const name = document.getElementById('addDetName').value;
  if (!name) { toast('请输入检测项目名称', 'error'); return; }
  const dataType = document.getElementById('addDetDataType').value;
  const stream = dataType === '实时视频流'
    ? document.getElementById('addDetStream').value
    : (document.getElementById('addDetFileUrl').value || '未指定文件');
  window.DB.detections.push({
    id: 'D' + String(window.DB.detections.length + 1).padStart(3, '0'),
    name, dataType, stream,
    algo: document.getElementById('addDetAlgo').value,
    roi: '矩形', sensitivity: 0.65, status: 'running',
    createdAt: new Date().toLocaleString('zh-CN'),
  });
  closeModal();
  toast('检测项目创建成功');
  if (window.API_SAVE) window.API_SAVE.detection({ name, dataType, stream, algo: document.getElementById('addDetAlgo').value, roi: '矩形', sensitivity: 0.65, status: 'running' }).catch(e => console.warn('[API]', e.message));
  window.DB._save();
  renderDetection();
}
window.confirmAddDetection = confirmAddDetection;

function toggleDetection(id) {
  const d = window.DB.detections.find(x => x.id === id);
  if (!d) return;
  d.status = d.status === 'running' ? 'stopped' : 'running';
  toast(`检测项目「${d.name}」已${d.status === 'running' ? '启动' : '停止'}`);
  if (window.API_SAVE) window.API_SAVE.toggleDetection(id).catch(e => console.warn('[API]', e.message));
  window.DB._save();
  renderDetection();
}
window.toggleDetection = toggleDetection;

function editDetection(id) {
  const d = window.DB.detections.find(x => x.id === id);
  if (!d) return;
  const DATA_TYPES = ['实时视频流', '视频文件', '图片分析', '离线视频'];
  const isStreamType = d.dataType === '实时视频流' || !d.dataType;
  window.modal(html`
    <div class="modal-title">检测配置 — ${d.name}</div>
    <div class="form-group">
      <label class="form-label">数据类型</label>
      <select class="form-select" id="editDetDataType" onchange="toggleEditDetStream(this.value)">
        ${DATA_TYPES.map(t => `<option value="${t}" ${(d.dataType || '实时视频流') === t ? 'selected' : ''}>${t}</option>`).join('')}
      </select>
    </div>
    <div class="form-group" id="editDetStreamGroup" style="${isStreamType ? '' : 'display:none'}">
      <label class="form-label">关联视频流</label>
      <select class="form-select" id="editDetStream">
        ${window.DB.streams.map(s => `<option value="${s.name}" ${s.name === d.stream ? 'selected' : ''}>${s.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-group" id="editDetFileGroup" style="${isStreamType ? 'display:none' : ''}">
      <label class="form-label">文件路径/URL</label>
      <input class="form-input" value="${isStreamType ? '' : d.stream}" placeholder="输入视频文件路径或 URL" id="editDetFileUrl" />
    </div>
    <div class="form-group">
      <label class="form-label">算法类型</label>
      <select class="form-select" id="editDetAlgo">
        ${window.DB.algoTypes.map(a => `<option value="${typeof a === 'string' ? a : a.name}" ${d.algo === (typeof a === 'string' ? a : a.name) ? 'selected' : ''}>${typeof a === 'string' ? a : a.name}</option>`).join('')}
      </select>
    </div>
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

window.toggleEditDetStream = (dataType) => {
  const streamGroup = document.getElementById('editDetStreamGroup');
  const fileGroup = document.getElementById('editDetFileGroup');
  if (dataType === '实时视频流') {
    streamGroup.style.display = '';
    fileGroup.style.display = 'none';
  } else {
    streamGroup.style.display = 'none';
    fileGroup.style.display = '';
  }
};

window.confirmEditDetection = (id) => {
  const d = window.DB.detections.find(x => x.id === id);
  if (!d) return;
  const dataType = document.getElementById('editDetDataType').value;
  d.dataType = dataType;
  d.stream = dataType === '实时视频流'
    ? document.getElementById('editDetStream').value
    : (document.getElementById('editDetFileUrl').value || d.stream);
  d.algo = document.getElementById('editDetAlgo').value;
  d.sensitivity = parseFloat(document.getElementById('editDetSensitivity').value) || d.sensitivity;
  d.roi = document.getElementById('editDetRoi').value || d.roi;
  closeModal();
  if (window.API_SAVE) window.API_SAVE.updateDetection(id, { dataType: d.dataType, stream: d.stream, algo: d.algo, sensitivity: d.sensitivity, roi: d.roi }).catch(e => console.warn('[API]', e.message));
  window.DB._save();
  toast('检测配置已保存');
  renderDetection();
};
