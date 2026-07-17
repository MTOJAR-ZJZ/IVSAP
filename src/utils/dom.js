/* ========================================
   Stream Analyzer — DOM Utilities
   ======================================== */

window.$ = (sel, ctx = document) => ctx.querySelector(sel);
window.$$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/** HTML 转义（用于用户输入或不可信数据） */
window.escapeHtml = function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

/** html 标签模板 — 不转义（用于渲染内部安全 HTML） */
function html(strings, ...vals) {
  return strings.reduce((acc, s, i) => acc + s + (vals[i] || ''), '');
}
window.html = html;

// Toast 通知
window.toast = function toast(msg, type = 'success') {
  const c = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, 3000);
};

// 模态框
window.modal = function modal(htmlContent) {
  const overlay = document.getElementById('modalOverlay');
  const content = document.getElementById('modalContent');
  content.innerHTML = htmlContent;
  overlay.style.display = 'flex';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.style.display = 'none'; };
};

window.closeModal = function closeModal() {
  document.getElementById('modalOverlay').style.display = 'none';
};

/** 格式化时间为 HH:MM:SS */
window.formatTime = function formatTime(d) {
  const dt = d ? new Date(d) : new Date();
  return dt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};
