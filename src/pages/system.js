/* ========================================
   Stream Analyzer — System Page
   大模型配置、系统设置
   ======================================== */

function renderSystem() {
  window.setPageContent(html`
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
              <div style="margin-top:10px;display:flex;gap:6px">
                <button class="btn btn-outline btn-xs" onclick="showEditApiModel('${m.id}')">编辑</button>
                ${!m.isDefault ? html`<button class="btn btn-outline btn-xs" onclick="setDefaultApiModel('${m.id}')">设为默认</button>` : ''}
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

// ===================== API MODEL CRUD =====================

window.showEditApiModel = (id) => {
  const m = window.DB.apiModels.find(x => x.id === id);
  if (!m) return;
  window.modal(html`
    <div class="modal-title">编辑模型 — ${m.name}</div>
    <div class="form-group">
      <label class="form-label">模型名称</label>
      <input class="form-input" value="${m.name}" id="editModelName" />
    </div>
    <div class="form-group">
      <label class="form-label">提供商</label>
      <input class="form-input" value="${m.provider}" id="editModelProvider" />
    </div>
    <div class="form-group">
      <label class="form-label">接口地址</label>
      <input class="form-input" value="${m.apiUrl}" id="editModelUrl" style="font-size:12px;font-family:monospace" />
    </div>
    <div class="form-group">
      <label class="form-label">API Key</label>
      <input class="form-input" type="password" value="${m.apiKey || ''}" placeholder="留空则保持不变" id="editModelKey" />
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="saveEditApiModel('${id}')">保存</button>
    </div>
  `);
};

window.saveEditApiModel = (id) => {
  const m = window.DB.apiModels.find(x => x.id === id);
  if (!m) return;
  m.name = document.getElementById('editModelName').value || m.name;
  m.provider = document.getElementById('editModelProvider').value || m.provider;
  m.apiUrl = document.getElementById('editModelUrl').value || m.apiUrl;
  const newKey = document.getElementById('editModelKey').value;
  if (newKey) m.apiKey = newKey;
  closeModal();
  window.DB._save();
  toast(`模型「${m.name}」配置已更新`);
  renderSystem();
};

window.setDefaultApiModel = (id) => {
  window.DB.apiModels.forEach(m => { m.isDefault = m.id === id; });
  window.DB._save();
  toast('默认模型已切换');
  renderSystem();
};
