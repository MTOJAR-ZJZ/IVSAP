/* ========================================
   Stream Analyzer — Main Entry
   App 初始化引导，页面模块在 pages/*.js 中定义
   ======================================== */

// 隐藏加载动画
function hideLoader() {
  const loader = document.getElementById('appLoader');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => loader.remove(), 500);
  }
}

// 后台标签页节流
function setupVisibilityThrottle() {
  let paused = false;
  document.addEventListener('visibilitychange', () => {
    paused = document.hidden;
  });
  window._isTabPaused = () => paused;
}
setupVisibilityThrottle();

window.APP_INIT = function appInit() {
  // 防止重复初始化
  if (window._appInitialized) return;
  if (!window.DB || !window.DB.streams) {
    setTimeout(appInit, 100);
    return;
  }

  window._appInitialized = true;

  // Sidebar navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(item.dataset.page);
      document.getElementById('sidebar').classList.remove('open');
    });
  });

  // Notification bell
  document.getElementById('notifBtn').addEventListener('click', () => {
    const pending = window.DB.alerts.filter(a => a.status === 'pending');
    window.modal(html`
      <div class="modal-title">通知消息</div>
      <div style="margin-bottom:12px;font-size:13px;color:var(--text-secondary)">您有 ${pending.length} 条待处理告警</div>
      ${pending.slice(0, 5).map(a => html`
        <div style="padding:8px 0;border-bottom:1px solid var(--border);font-size:13px">
          <strong>${a.type}</strong> @ ${a.stream_name || a.stream}
          <span style="color:var(--text-secondary);float:right">${a.created_at || a.time}</span>
        </div>
      `).join('')}
      ${pending.length > 5 ? html`<div style="padding:8px 0;font-size:12px;color:var(--text-secondary)">...还有 ${pending.length - 5} 条</div>` : ''}
      ${pending.length === 0 ? html`<div style="padding:20px;text-align:center;font-size:13px;color:var(--text-secondary)">暂无新通知</div>` : ''}
      <div class="modal-actions"><button class="btn btn-outline" onclick="closeModal()">关闭</button></div>
    `);
    const dot = document.querySelector('.notif-dot');
    if (dot) dot.style.display = pending.length === 0 ? 'none' : 'block';
  });

  // Sidebar toggle (mobile)
  document.getElementById('sidebarToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Clock（后台时降频到 30 秒）
  let clockTimer = 1000;
  function updateTime() {
    document.getElementById('topbarTime').textContent = new Date().toLocaleString('zh-CN');
    if (document.hidden) {
      clearInterval(window._clockInterval);
      clockTimer = 30000;
      window._clockInterval = setInterval(updateTime, clockTimer);
    } else if (clockTimer !== 1000) {
      clearInterval(window._clockInterval);
      clockTimer = 1000;
      window._clockInterval = setInterval(updateTime, clockTimer);
    }
  }
  updateTime();
  window._clockInterval = setInterval(updateTime, clockTimer);

  // Apply role permissions
  applyRolePermissions();
  updateNavBadges();

  // Auto execute data cleanup（后台时暂停清理）
  runDataCleanup();
  setInterval(() => { if (!document.hidden) runDataCleanup(); }, 24 * 60 * 60 * 1000);

  // Render default page
  navigate('dashboard');

  // 隐藏加载动画
  hideLoader();
};

// ===================== BOOTSTRAP =====================

document.addEventListener('DOMContentLoaded', () => {
  if (window._appInitialized) return;

  if (window.DB && window.DB.streams) {
    window.APP_INIT();
  } else {
    const check = setInterval(() => {
      if (window._appInitialized) {
        clearInterval(check);
      } else if (window.DB && window.DB.streams) {
        clearInterval(check);
        window.APP_INIT();
      }
    }, 200);
    setTimeout(() => clearInterval(check), 10000);
  }
});
