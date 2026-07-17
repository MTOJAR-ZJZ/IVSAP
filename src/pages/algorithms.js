/* ========================================
   Stream Analyzer — Algorithms Page
   算法类型管理
   ======================================== */

function renderAlgorithms() {
  window.setPageContent(html`
    <div class="quick-actions" style="margin-bottom:16px">
      <button class="btn btn-outline" onclick="navigate('detection')">← 返回检测项目</button>
      <div style="margin-left:auto;display:flex;gap:8px;align-items:center">
        <input class="form-input" placeholder="输入新算法名称" id="algoPageNewName" style="width:200px" />
        <button class="btn btn-primary" onclick="addAlgoFromPage()">＋ 添加算法</button>
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        <span class="card-title">算法类型管理</span>
        <span style="font-size:12px;color:var(--text-secondary)">共 ${window.DB.algoTypes.length} 种</span>
      </div>
      <div class="card-body">
        <div style="display:flex;flex-wrap:wrap;gap:10px">
          ${window.DB.algoTypes.map((a, i) => {
            const algoName = typeof a === 'string' ? a : a.name;
            const promptText = (a.prompt || '暂无提示词').slice(0, 30);
            return html`
              <div style="display:flex;align-items:center;gap:8px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:10px 14px;min-width:200px">
                <div style="flex:1">
                  <div style="font-size:14px;font-weight:600;color:var(--text)">${escapeHtml(algoName)}</div>
                  <div style="font-size:11px;color:var(--text-secondary);margin-top:2px">${escapeHtml(promptText)}${a.prompt && a.prompt.length > 30 ? '...' : ''}</div>
                </div>
                <div style="display:flex;gap:4px">
                  <button class="btn btn-outline btn-xs" onclick="editAlgoPrompt(${i})">编辑</button>
                  <button class="btn btn-danger btn-xs" onclick="removeAlgoType(${i})">删除</button>
                </div>
              </div>
            `;
          }).join('')}
          ${window.DB.algoTypes.length === 0 ? '<div style="padding:24px;text-align:center;color:var(--text-secondary);font-size:13px">暂无算法类型，请添加</div>' : ''}
        </div>
      </div>
    </div>
    <div style="margin-top:16px;font-size:12px;color:var(--text-secondary)"">💡 点击"编辑"按钮可修改算法名称和提示词 · 算法名称变更自动同步到检测项目 · 大模型接口请在系统管理中配置</div>
  `);
}
window.renderAlgorithms = renderAlgorithms;

// ===================== ALGORITHM MANAGEMENT =====================

window.showAlgoManager = () => {
  window.modal(html`
    <div class="modal-title">算法类型管理</div>
    <div style="margin-bottom:16px">
      <div style="font-size:13px;color:var(--text-secondary);margin-bottom:10px">当前支持的算法类型（共 ${window.DB.algoTypes.length} 种）</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${window.DB.algoTypes.map((a, i) => {
          const algoName = typeof a === 'string' ? a : a.name;
          return html`
            <div style="display:flex;align-items:center;gap:6px;background:#f8fafc;border:1px solid var(--border);border-radius:6px;padding:6px 10px">
              <span style="font-size:13px;font-weight:600;cursor:pointer" onclick="editAlgoPrompt(${i})" title="点击编辑算法名称和提示词">${escapeHtml(algoName)}</span>
              <span style="cursor:pointer;color:#999;font-size:16px;line-height:1" onclick="removeAlgoType(${i})" title="移除该算法">×</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
    <div style="display:flex;gap:8px">
      <input class="form-input" placeholder="输入新算法名称" id="newAlgoName" style="flex:1" />
      <button class="btn btn-primary" onclick="addAlgoType()">＋ 添加</button>
    </div>
    <div style="margin-top:12px;font-size:12px;color:var(--text-secondary)">
      💡 点击算法名称可编辑名称和提示词 · 算法名称变更自动同步到检测项目 · 大模型接口请在系统管理中配置
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
  window.modal(html`
    <div class="modal-title">编辑算法 — ${escapeHtml(algoName)}</div>
    <div class="form-group">
      <label class="form-label">算法名称</label>
      <input class="form-input" value="${escapeHtml(algoName)}" id="algoName" placeholder="输入算法名称" />
    </div>
    <div class="form-group">
      <label class="form-label">提示词（Prompt）</label>
      <textarea class="form-input" rows="6" placeholder="输入 AI 检测提示词..." id="algoPrompt" style="font-size:13px">${escapeHtml(prompt)}</textarea>
      <div style="font-size:11px;color:var(--text-secondary);margin-top:4px">提示词将作为系统指令发送给大模型，用于指导 AI 分析视频画面</div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="showAlgoManager()">返回</button>
      <button class="btn btn-primary" onclick="saveAlgoPrompt(${index})">保存</button>
    </div>
  `);
};

window.saveAlgoPrompt = (index) => {
  const a = window.DB.algoTypes[index];
  if (typeof a === 'string') window.DB.algoTypes[index] = { name: a };
  const newName = document.getElementById('algoName').value.trim();
  if (!newName) { toast('请输入算法名称', 'error'); return; }
  const oldName = window.DB.algoTypes[index].name;
  const duplicate = window.DB.algoTypes.some((x, i) => i !== index && (typeof x === 'string' ? x : x.name) === newName);
  if (duplicate) { toast('该算法名称已存在', 'error'); return; }
  if (oldName !== newName) {
    window.DB.detections.forEach(d => { if (d.algo === oldName) d.algo = newName; });
  }
  window.DB.algoTypes[index].name = newName;
  window.DB.algoTypes[index].prompt = document.getElementById('algoPrompt').value;
  if (window.API_SAVE) window.API_SAVE.updateAlgo(index, { name: newName, prompt: window.DB.algoTypes[index].prompt }).catch(e => console.warn('[API]', e.message));
  window.DB._save();
  toast('算法已保存');
  if (window.AppState.currentPage === 'algorithms') renderAlgorithms(); else window.showAlgoManager();
};

window.addAlgoType = () => {
  const name = document.getElementById('newAlgoName').value.trim();
  if (!name) { toast('请输入算法名称', 'error'); return; }
  if (window.DB.algoTypes.some(a => (typeof a === 'string' ? a : a.name) === name)) { toast('该算法已存在', 'error'); return; }
  window.DB.algoTypes.push({ name, prompt: '' });
  document.getElementById('newAlgoName').value = '';
  if (window.API_SAVE) window.API_SAVE.addAlgo(name).catch(e => console.warn('[API]', e.message));
  window.DB._save();
  toast(`算法「${name}」已添加`);
  window.showAlgoManager();
};

window.addAlgoFromPage = () => {
  const name = document.getElementById('algoPageNewName').value.trim();
  if (!name) { toast('请输入算法名称', 'error'); return; }
  if (window.DB.algoTypes.some(a => (typeof a === 'string' ? a : a.name) === name)) { toast('该算法已存在', 'error'); return; }
  window.DB.algoTypes.push({ name, prompt: '' });
  document.getElementById('algoPageNewName').value = '';
  if (window.API_SAVE) window.API_SAVE.addAlgo(name).catch(e => console.warn('[API]', e.message));
  window.DB._save();
  toast(`算法「${name}」已添加`);
  renderAlgorithms();
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
  if (window.API_SAVE) window.API_SAVE.deleteAlgo(index).catch(e => console.warn('[API]', e.message));
  window.DB._save();
  toast(`算法「${name}」已移除`);
  if (window.AppState.currentPage === 'algorithms') renderAlgorithms(); else window.showAlgoManager();
};
