/* ========================================
   Stream Analyzer — API Client
   桥接前端 window.DB 与后端 REST API
   ======================================== */

const API_BASE = '/api';
let token = localStorage.getItem('ivsap_token');

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API_BASE + path, opts);
  if (res.status === 401) {
    // Token expired — redirect to login
    localStorage.removeItem('ivsap_token');
    showLoginPage();
    throw new Error('登录已过期，请重新登录');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}

function showLoginPage() {
  document.getElementById('app').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#f0f2f5">
      <div style="background:#fff;padding:40px;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,.1);width:380px">
        <div style="text-align:center;margin-bottom:28px">
          <div style="font-size:36px;margin-bottom:8px">◆</div>
          <div style="font-size:20px;font-weight:700">智能视频流分析平台</div>
          <div style="font-size:13px;color:#666;margin-top:4px">请登录</div>
        </div>
        <div style="margin-bottom:16px">
          <input class="form-input" id="loginAccount" placeholder="账号" style="padding:10px 14px" />
        </div>
        <div style="margin-bottom:20px">
          <input class="form-input" id="loginPassword" type="password" placeholder="密码" style="padding:10px 14px" />
        </div>
        <button class="btn btn-primary" style="width:100%;justify-content:center;padding:10px" onclick="doLogin()">登 录</button>
        <div style="text-align:center;margin-top:12px;font-size:12px;color:#999">演示账号: admin / 123456</div>
      </div>
    </div>
  `;
}

window.doLogin = async () => {
  const account = document.getElementById('loginAccount').value;
  const password = document.getElementById('loginPassword').value;
  if (!account || !password) { alert('请输入账号和密码'); return; }
  try {
    const data = await request('POST', '/auth/login', { account, password });
    token = data.token;
    localStorage.setItem('ivsap_token', token);
    localStorage.setItem('ivsap_user', JSON.stringify(data.user));
    await loadAllData();
    // Re-init the main app
    if (window.APP_INIT) window.APP_INIT();
  } catch (e) {
    alert(e.message);
  }
};

async function loadAllData() {
  try {
    const [
      streams, detections, alerts, tickets, users,
      roles, depts, algoTypes, apiModels, schedules,
      logs, config, ticketRules
    ] = await Promise.all([
      request('GET', '/streams'),
      request('GET', '/detections'),
      request('GET', '/alerts?limit=200'),
      request('GET', '/tickets'),
      request('GET', '/users'),
      request('GET', '/roles'),
      request('GET', '/depts'),
      request('GET', '/algorithms'),
      request('GET', '/system/api-models'),
      request('GET', '/system/schedules'),
      request('GET', '/system/logs'),
      request('GET', '/system/config'),
      request('GET', '/system/ticket-rules'),
    ]);

    // Build department tree
    const deptTree = buildDeptTree(depts);

    window.DB = {
      streams, detections, alerts, tickets, users, roles,
      depts: deptTree,
      algoTypes,
      apiModels,
      schedules: schedules.map(s => ({
        year: s.year, month: s.month, date: s.date,
        name: s.user_name, shift: s.shift
      })),
      ticketLogs: logs,
      config: {
        logRetentionDays: config.logRetentionDays || 90,
        screenshotRetentionDays: config.screenshotRetentionDays || 7,
        websocketHeartbeat: config.websocketHeartbeat || 30,
        globalSensitivity: config.globalSensitivity || 0.65,
        ticketRules: ticketRules || {},
      },
      _save: async () => { /* no-op — backend saves immediately */ },
      _token: token,
    };
  } catch (e) {
    console.error('Failed to load data:', e);
    throw e; // 向上传播错误，让 autoInit 的 .catch() 能正确触发降级逻辑
  }
}

function buildDeptTree(flatDepts) {
  const map = {};
  flatDepts.forEach(d => { map[d.id] = { ...d, children: [] }; });
  const roots = [];
  flatDepts.forEach(d => {
    if (d.parent_id && map[d.parent_id]) {
      map[d.parent_id].children.push(map[d.id]);
    } else {
      if (map[d.id]) roots.push(map[d.id]);
    }
  });
  return roots;
}

// ===== AUTO INIT =====

(function autoInit() {
  if (token) {
    // 有 token → 自动加载后台数据
    loadAllData().then(() => {
      if (window.APP_INIT) window.APP_INIT();
    }).catch(() => {
      // 后端不可用时，降级使用 db.js 的模拟数据
      console.warn('后端不可用，使用本地模拟数据');
      if (window.DB && window.DB.streams && window.APP_INIT) {
        window.APP_INIT();
      } else {
        showLoginPage();
      }
    });
  } else if (!window.DB || !window.DB.streams) {
    // 无 token 且无本地数据 → 显示登录页
    showLoginPage();
  }
  // 无 token 但有 db.js 模拟数据 → 由 main.js 直接启动
})();

// ===== Save helpers (called from main.js mutations) =====

window.API_SAVE = {
  async stream(data) { return request('POST', '/streams', data); },
  async updateStream(id, data) { return request('PUT', '/streams/' + id, data); },
  async deleteStream(id) { return request('DELETE', '/streams/' + id); },
  async batchStreamAction(ids, action) {
    for (const id of ids) {
      if (action === 'delete') await request('DELETE', '/streams/' + id);
      else await request('PATCH', '/streams/' + id + '/status', { status: action === 'enable' ? 'online' : 'offline' });
    }
  },

  async detection(data) { return request('POST', '/detections', data); },
  async updateDetection(id, data) { return request('PUT', '/detections/' + id, data); },
  async toggleDetection(id) { return request('PATCH', '/detections/' + id + '/toggle'); },

  async updateAlertStatus(id, status, note) { return request('PATCH', '/alerts/' + id + '/status', { status, note }); },
  async createTicket(data) { return request('POST', '/tickets', data); },

  async assignTicket(id, assignee) { return request('PUT', '/tickets/' + id + '/assign', { assignee }); },
  async updateTicketStatus(id, status, desc_text) { return request('PUT', '/tickets/' + id + '/status', { status, desc_text }); },

  async addUser(data) { return request('POST', '/users', data); },
  async updateUser(id, data) { return request('PUT', '/users/' + id, data); },
  async toggleUser(id) { return request('PATCH', '/users/' + id + '/toggle'); },

  async addRole(data) { return request('POST', '/roles', data); },
  async updateRole(id, data) { return request('PUT', '/roles/' + id, data); },

  async addDept(data) { return request('POST', '/depts', data); },
  async addAlgo(name) { return request('POST', '/algorithms', { name }); },
  async updateAlgo(id, data) { return request('PUT', '/algorithms/' + id, data); },
  async deleteAlgo(id) { return request('DELETE', '/algorithms/' + id); },

  async saveConfig(data) { return request('PUT', '/system/config', data); },
  async saveTicketRules(data) { return request('PUT', '/system/ticket-rules', data); },
  async updateApiModel(id, data) { return request('PUT', '/system/api-models/' + id, data); },
  async setDefaultModel(id) { return request('POST', '/system/api-models/' + id + '/default'); },
};
