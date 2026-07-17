/* ========================================
   Stream Analyzer — Users Page
   人员权限、角色管理
   ======================================== */


function flattenDepts(depts, prefix = '') {
  const result = [];
  depts.forEach(d => {
    const name = prefix ? prefix + ' - ' + d.name : d.name;
    result.push(name);
    if (d.children && d.children.length > 0) {
      result.push(...flattenDepts(d.children, name));
    }
  });
  return result;
}

function findDept(list, id) {
  for (const d of list) {
    if (d.id === id) return d;
    if (d.children) {
      const found = findDept(d.children, id);
      if (found) return found;
    }
  }
  return null;
}

function renderUsers() {
  window.setPageContent(html`
    <div class="tabs" id="userTabContent">
      <span class="tab active" data-tab="users" onclick="switchUserTab(this.parentElement, 'users')">人员管理</span>
      <span class="tab" data-tab="roles" onclick="switchUserTab(this.parentElement, 'roles')">角色权限</span>
    </div>
    <div id="userPageContent"></div>
  `);
  switchUserTab(document.getElementById('userTabContent'), 'users');
}
window.renderUsers = renderUsers;

function switchUserTab(container, tab) {
  container.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  const content = document.getElementById('userPageContent');
  if (tab === 'users') {
    content.innerHTML = html`
      <div class="quick-actions" style="margin-bottom:16px">
        <button class="btn btn-primary" onclick="showAddUser()">＋ 添加人员</button>
        <button class="btn btn-outline" onclick="exportAddressBook()">📥 导出通讯录</button>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">人员列表</span></div>
        <div class="card-body" style="padding:0">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>姓名</th>
                  <th>账号</th>
                  <th>角色</th>
                  <th>手机号</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                ${window.DB.users.map(u => html`
                  <tr>
                    <td><strong>${escapeHtml(u.name)}</strong></td>
                    <td>${escapeHtml(u.account)}</td>
                    <td>${escapeHtml(u.role)}</td>
                    <td>${escapeHtml(u.phone)}</td>
                    <td><span class="badge ${u.status === 'active' ? 'badge-online' : 'badge-offline'}"><span class="badge-dot"></span>${u.status === 'active' ? '启用' : '禁用'}</span></td>
                    <td>
                      <button class="btn btn-outline btn-xs" onclick="showEditUser('${u.id}')">编辑</button>
                      <button class="btn btn-${u.status === 'active' ? 'warning' : 'success'} btn-xs" onclick="toggleUser('${u.id}')">${u.status === 'active' ? '禁用' : '启用'}</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  } else if (tab === 'roles') {
    content.innerHTML = html`
      <div class="quick-actions" style="margin-bottom:16px">
        <button class="btn btn-primary" onclick="showAddRole()">＋ 创建角色</button>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">角色列表</span></div>
        <div class="card-body" style="padding:0">
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>角色名称</th><th>类型</th><th>可访问页面</th><th>操作</th></tr>
              </thead>
              <tbody>
                ${window.DB.roles.map(r => html`
                  <tr>
                    <td><strong>${r.name}</strong></td>
                    <td>${r.preset ? '预设' : '自定义'}</td>
                    <td style="font-size:12px;color:var(--text-secondary)">${r.perms.map(p => window.PAGE_ITEMS.find(i => i.id === p)?.label || p).join('、')}</td>
                    <td><button class="btn btn-outline btn-xs" onclick="showEditRole('${r.id}')">编辑</button></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }
}
window.switchUserTab = switchUserTab;

function renderOrgTree(depts) {
  return depts.map(d => html`
    <div class="org-node">
      <div class="org-node-header" onclick="toggleOrgChildren(this)">
        ${d.children && d.children.length > 0 ? '<span class="org-toggle">▾</span>' : '<span class="org-toggle" style="visibility:hidden">▸</span>'}
        <span>${d.name}</span>
      </div>
      ${d.children && d.children.length > 0 ? html`<div class="org-children">${renderOrgTree(d.children)}</div>` : ''}
    </div>
  `).join('');
}

// ===================== USER CRUD =====================

window.toggleOrgChildren = (el) => {
  const children = el.nextElementSibling;
  if (children && children.classList.contains('org-children')) {
    children.style.display = children.style.display === 'none' ? 'block' : 'none';
    el.querySelector('.org-toggle').textContent = children.style.display === 'none' ? '▸' : '▾';
  }
};

window.showAddDept = () => {
  window.modal(html`
    <div class="modal-title">新增部门</div>
    <div class="form-group">
      <label class="form-label">部门名称 *</label>
      <input class="form-input" placeholder="如：三值班组" id="deptName" />
    </div>
    <div class="form-group">
      <label class="form-label">上级部门</label>
      <select class="form-select" id="deptParent">
        <option value="">（顶级部门）</option>
        ${window.DB.depts.map(d => html`<option value="${d.id}">${d.name}</option>`).join('')}
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="saveAddDept()">创建</button>
    </div>
  `);
};

window.saveAddDept = () => {
  const name = document.getElementById('deptName').value;
  if (!name) { toast('请输入部门名称', 'error'); return; }
  const parentId = document.getElementById('deptParent').value;
  const newDept = { id: 'DEPT' + Date.now(), name, children: [] };
  if (parentId) {
    const parent = findDept(window.DB.depts, parentId);
    if (parent) parent.children.push(newDept);
  } else {
    window.DB.depts.push(newDept);
  }
  closeModal();
  if (window.API_SAVE) window.API_SAVE.addDept({ id: newDept.id, name, parent_id: parentId || null }).catch(e => console.warn('[API]', e.message));
  window.DB._save();
  toast(`部门「${name}」创建成功`);
  renderUsers();
};

window.showAddUser = () => {
  window.modal(html`
    <div class="modal-title">添加人员</div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">姓名 *</label>
        <input class="form-input" placeholder="姓名" id="userName" />
      </div>
      <div class="form-group">
        <label class="form-label">手机号 *</label>
        <input class="form-input" placeholder="手机号（将作为登录账号）" id="userPhone" oninput="document.getElementById('userAccount').value=this.value" />
        <input type="hidden" id="userAccount" />
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">邮箱</label>
      <input class="form-input" placeholder="邮箱" id="userEmail" />
    </div>
    <div class="form-group">
      <label class="form-label">角色</label>
      <select class="form-select" id="userRole"><option>值班人员</option><option>运维主管</option><option>系统管理员</option><option>业务分析师</option></select>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="saveAddUser()">保存</button>
    </div>
  `);
};

window.saveAddUser = () => {
  const name = document.getElementById('userName').value;
  const phone = document.getElementById('userPhone').value;
  if (!name) { toast('请输入姓名', 'error'); return; }
  if (!phone) { toast('请输入手机号', 'error'); return; }
  window.DB.users.push({
    id: 'U' + String(window.DB.users.length + 1).padStart(3,'0'),
    name, account: phone,
    dept: '',
    role: document.getElementById('userRole').value,
    phone, email: document.querySelector('#userEmail')?.value || '',
    status: 'active',
  });
  closeModal();
  toast('人员添加成功');
  if (window.API_SAVE) window.API_SAVE.addUser({ name, account: phone, dept: document.getElementById('userDept').value, role: document.getElementById('userRole').value, phone, email: document.querySelector('#userEmail')?.value || '', status: 'active' }).catch(e => console.warn('[API]', e.message));
  window.DB._save();
  renderUsers();
};

window.exportAddressBook = () => {
  let csv = '姓名,账号,角色,手机号,邮箱,状态\n';
  window.DB.users.forEach(u => {
    csv += `${u.name},${u.account},${u.role},${u.phone},${u.email},${u.status === 'active' ? '启用' : '禁用'}\n`;
  });
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '通讯录_' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('通讯录已导出');
};

window.showEditUser = (id) => {
  const u = window.DB.users.find(x => x.id === id);
  if (!u) return;
  window.modal(html`
    <div class="modal-title">编辑人员</div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">姓名 *</label>
        <input class="form-input" value="${u.name}" id="editUserName" />
      </div>
      <div class="form-group">
        <label class="form-label">手机号 *</label>
        <input class="form-input" value="${u.phone}" id="editUserPhone" oninput="document.getElementById('editUserAccount').value=this.value" />
        <input type="hidden" id="editUserAccount" value="${u.phone}" />
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">邮箱</label>
      <input class="form-input" value="${u.email}" id="editUserEmail" />
    </div>
    <div class="form-group">
      <label class="form-label">角色</label>
      <select class="form-select" id="editUserRole">
        <option value="系统管理员" ${u.role === '系统管理员' ? 'selected' : ''}>系统管理员</option>
        <option value="运维主管" ${u.role === '运维主管' ? 'selected' : ''}>运维主管</option>
        <option value="值班人员" ${u.role === '值班人员' ? 'selected' : ''}>值班人员</option>
        <option value="业务分析师" ${u.role === '业务分析师' ? 'selected' : ''}>业务分析师</option>
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="saveEditUser('${id}')">保存</button>
    </div>
  `);
};

window.saveEditUser = (id) => {
  const u = window.DB.users.find(x => x.id === id);
  const name = document.getElementById('editUserName').value;
  const phone = document.getElementById('editUserPhone').value;
  if (!name) { toast('请输入姓名', 'error'); return; }
  if (!phone) { toast('请输入手机号', 'error'); return; }
  const oldName = u.name;
  u.name = name;
  u.phone = document.getElementById('editUserPhone').value;
  u.account = u.phone;
  u.email = document.getElementById('editUserEmail').value;
  u.dept = '';
  u.role = document.getElementById('editUserRole').value;
  if (oldName !== name) {
    window.DB.tickets.forEach(t => { if (t.assignee === oldName) t.assignee = name; });
  }
  closeModal();
  toast('人员信息已更新，工单责任人已同步');
  if (window.API_SAVE) window.API_SAVE.updateUser(id, { name: u.name, account: u.account, dept: u.dept, role: u.role, phone: u.phone, email: u.email }).catch(e => console.warn('[API]', e.message));
  window.DB._save();
  renderUsers();
};

window.toggleUser = (id) => {
  const u = window.DB.users.find(x => x.id === id);
  u.status = u.status === 'active' ? 'disabled' : 'active';
  toast(`${u.name} 已${u.status === 'active' ? '启用' : '禁用'}`);
  if (window.API_SAVE) window.API_SAVE.toggleUser(id).catch(e => console.warn('[API]', e.message));
  window.DB._save();
  renderUsers();
};

// ===================== ROLE CRUD =====================

window.showAddRole = () => {
  window.modal(html`
    <div class="modal-title">创建自定义角色</div>
    <div class="form-group">
      <label class="form-label">角色名称</label>
      <input class="form-input" placeholder="如：巡检员" id="addRoleName" />
    </div>
    <div class="form-group">
      <label class="form-label">可访问的子页面</label>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">
        ${window.PAGE_ITEMS.map(p => html`
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--text-secondary);cursor:pointer">
            <input type="checkbox" data-page="${p.id}" checked /> ${p.label}
          </label>
        `).join('')}
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="saveAddRole()">创建</button>
    </div>
  `);
};

window.saveAddRole = () => {
  const name = document.getElementById('addRoleName').value;
  if (!name) { toast('请输入角色名称', 'error'); return; }
  const checks = document.querySelectorAll('#modalContent input[type="checkbox"]');
  const selected = [];
  checks.forEach((c) => { if (c.checked) selected.push(c.dataset.page); });
  window.DB.roles.push({
    id: 'R' + String(window.DB.roles.length + 1).padStart(3,'0'),
    name, preset: false, perms: selected.length > 0 ? selected : ['none'],
  });
  closeModal();
  if (window.API_SAVE) window.API_SAVE.addRole({ name, preset: false, perms: selected.length > 0 ? selected : ['none'] }).catch(e => console.warn('[API]', e.message));
  window.DB._save();
  toast('角色创建成功');
  switchUserTab(document.querySelector('#userTabContent'), 'roles');
};

window.showEditRole = (id) => {
  const r = window.DB.roles.find(x => x.id === id);
  if (!r) return;
  window.modal(html`
    <div class="modal-title">编辑角色 — ${r.name}</div>
    <div class="form-group">
      <label class="form-label">角色名称</label>
      <input class="form-input" value="${r.name}" id="editRoleName" />
    </div>
    <div class="form-group">
      <label class="form-label">可访问的子页面</label>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">
        ${window.PAGE_ITEMS.map(p => html`
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--text-secondary);cursor:pointer">
            <input type="checkbox" data-page="${p.id}" ${r.perms.includes(p.id) ? 'checked' : ''} /> ${p.label}
          </label>
        `).join('')}
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="saveEditRole('${id}')">保存</button>
    </div>
  `);
};

window.saveEditRole = (id) => {
  const r = window.DB.roles.find(x => x.id === id);
  const name = document.getElementById('editRoleName').value;
  if (!name) { toast('请输入角色名称', 'error'); return; }
  const checks = document.querySelectorAll('#modalContent input[type="checkbox"]');
  const selected = [];
  checks.forEach((c) => { if (c.checked) selected.push(c.dataset.page); });
  r.name = name;
  r.perms = selected.length > 0 ? selected : ['none'];
  r.preset = false;
  closeModal();
  if (window.API_SAVE) window.API_SAVE.updateRole(id, { name, perms: selected.length > 0 ? selected : ['none'], preset: false }).catch(e => console.warn('[API]', e.message));
  window.DB._save();
  toast('角色已更新，导航菜单已同步');
  switchUserTab(document.querySelector('#userTabContent'), 'roles');
  applyRolePermissions();
};
