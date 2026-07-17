/* ========================================
   Stream Analyzer — App Core
   全局状态、导航、常量定义
   ======================================== */

// ===================== PAGE REGISTRY =====================
const PAGE_ITEMS = [
  { id: 'dashboard', label: '工作台' },
  { id: 'streams', label: '推流管理' },
  { id: 'detection', label: '检测项目' },
  { id: 'algorithms', label: '算法管理' },
  { id: 'alerts', label: '告警中心' },
  { id: 'tickets', label: '工单分发' },
  { id: 'users', label: '人员权限' },
  { id: 'system', label: '系统管理' },
];
window.PAGE_ITEMS = PAGE_ITEMS;

// ===================== STATE =====================
let currentPage = 'dashboard';
let currentTicketMode = 'list';
let alertCount = 0;

window.AppState = {
  get currentPage() { return currentPage; },
  set currentPage(v) { currentPage = v; },
  get currentTicketMode() { return currentTicketMode; },
  set currentTicketMode(v) { currentTicketMode = v; },
};

// ===================== NAVIGATION =====================
function setPageContent(htmlContent) {
  document.getElementById('pageContainer').innerHTML = htmlContent;
}
window.setPageContent = setPageContent;

function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });
  const pageItem = PAGE_ITEMS.find(p => p.id === page);
  if (pageItem) document.getElementById('pageTitle').textContent = pageItem.label;
  const renderers = {
    dashboard: window.renderDashboard,
    streams: window.renderStreams,
    detection: window.renderDetection,
    algorithms: window.renderAlgorithms,
    alerts: window.renderAlerts,
    tickets: () => window.renderTickets('list'),
    users: window.renderUsers,
    system: window.renderSystem,
  };
  (renderers[page] || window.renderDashboard)();
}
window.navigate = navigate;

// ===================== ROLE PERMISSIONS =====================
function applyRolePermissions() {
  const currentUser = window.DB.users.find(u => u.name === '管理员');
  if (!currentUser) return;
  const role = window.DB.roles.find(r => r.name === currentUser.role);
  if (!role) return;
  document.querySelectorAll('.nav-item').forEach(item => {
    const p = item.dataset.page;
    item.style.display = role.perms.includes(p) ? '' : 'none';
  });
}
window.applyRolePermissions = applyRolePermissions;

// ===================== DATA CLEANUP =====================
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
