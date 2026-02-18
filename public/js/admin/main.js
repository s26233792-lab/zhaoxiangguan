/**
 * 管理后台主入口
 */
import { api } from '../services/api.js';
import { storage } from '../services/storage.js';
import { config } from '../app/config.js';

// ==================== 状态管理 ====================
const state = {
  isAuthenticated: false,
  adminPassword: null,
  stats: null,
  codes: [],
  filter: 'all',
  search: '',
  selectedCodes: new Set(),
};

// ==================== DOM 元素 ====================
const elements = {
  loginPanel: null,
  adminPanel: null,
  passwordInput: null,
  loginBtn: null,

  // 统计
  statTotalCodes: null,
  statActiveCodes: null,
  statUsers: null,

  // 生成卡密
  batchSpecsContainer: null,
  addSpecBtn: null,
  generateBtn: null,

  // 卡密列表
  codeSearch: null,
  activeTableBody: null,
  usedTableBody: null,
  activeCount: null,
  usedCount: null,

  // 按钮
  refreshBtn: null,
  exportBtn: null,
};

// ==================== 初始化 ====================
function init() {
  // 缓存 DOM 元素
  cacheElements();

  // 检查登录状态
  checkAuth();

  // 绑定事件
  bindEvents();
}

function cacheElements() {
  elements.loginPanel = document.querySelector('#login-panel');
  elements.adminPanel = document.querySelector('#admin-panel');
  elements.passwordInput = document.querySelector('#admin-password');
  elements.loginBtn = document.querySelector('#login-btn');

  elements.statTotalCodes = document.querySelector('#stat-total-codes');
  elements.statActiveCodes = document.querySelector('#stat-active-codes');
  elements.statUsers = document.querySelector('#stat-users');

  elements.batchSpecsContainer = document.querySelector('#batch-specs-container');
  elements.addSpecBtn = document.querySelector('#add-spec-btn');
  elements.generateBtn = document.querySelector('#generate-codes-btn');

  elements.codeSearch = document.querySelector('#code-search');
  elements.activeTableBody = document.querySelector('#active-table-body');
  elements.usedTableBody = document.querySelector('#used-table-body');
  elements.activeCount = document.querySelector('#active-count');
  elements.usedCount = document.querySelector('#used-count');

  elements.refreshBtn = document.querySelector('#refresh-btn');
  elements.exportBtn = document.querySelector('#export-btn');
}

function bindEvents() {
  // 登录
  elements.loginBtn?.addEventListener('click', handleLogin);
  elements.passwordInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
  });

  // 生成卡密
  elements.addSpecBtn?.addEventListener('click', addBatchSpec);
  elements.generateBtn?.addEventListener('click', handleGenerateCodes);

  // 搜索
  elements.codeSearch?.addEventListener('input', (e) => {
    state.search = e.target.value.toLowerCase();
    renderCodes();
  });

  // 刷新和导出
  elements.refreshBtn?.addEventListener('click', loadCodes);
  elements.exportBtn?.addEventListener('click', handleExport);
}

// ==================== 认证 ====================
function checkAuth() {
  const auth = storage.get(config.adminAuthKey);
  if (auth) {
    state.isAuthenticated = true;
    state.adminPassword = auth.password;
    showAdminPanel();
  } else {
    showLoginPanel();
  }
}

async function handleLogin() {
  const password = elements.passwordInput?.value;

  if (!password) {
    showToast('请输入密码', 'warning');
    return;
  }

  try {
    // 验证密码（通过获取统计数据测试）
    await api.getStats(password);

    state.isAuthenticated = true;
    state.adminPassword = password;

    storage.set(config.adminAuthKey, { password, timestamp: Date.now() });

    showToast('登录成功', 'success');
    showAdminPanel();

  } catch (err) {
    showToast('密码错误', 'error');
  }
}

function logout() {
  state.isAuthenticated = false;
  state.adminPassword = null;
  storage.remove(config.adminAuthKey);
  showLoginPanel();
}

function showLoginPanel() {
  elements.loginPanel?.classList.remove('hidden');
  elements.adminPanel?.classList.add('hidden');
}

function showAdminPanel() {
  elements.loginPanel?.classList.add('hidden');
  elements.adminPanel?.classList.remove('hidden');

  // 加载数据
  loadStats();
  loadCodes();

  // 添加默认生成规格
  addBatchSpec();
}

// ==================== 统计数据 ====================
async function loadStats() {
  try {
    const stats = await api.getStats(state.adminPassword);
    state.stats = stats;

    elements.statTotalCodes.textContent = stats.totalCodes || 0;
    elements.statActiveCodes.textContent = stats.activeCodes || 0;
    elements.statUsers.textContent = stats.totalUsers || 0;

  } catch (err) {
    console.error('Load stats error:', err);
  }
}

// ==================== 卡密管理 ====================
async function loadCodes() {
  try {
    const result = await api.getCodes(state.adminPassword, {
      status: state.filter,
      limit: 1000,
    });

    state.codes = result.codes || [];
    renderCodes();

  } catch (err) {
    console.error('Load codes error:', err);
    showToast('加载失败', 'error');
  }
}

function renderCodes() {
  const filteredCodes = state.codes.filter(code => {
    if (!state.search) return true;
    return code.code.toLowerCase().includes(state.search) ||
           code.points.toString().includes(state.search);
  });

  const activeCodes = filteredCodes.filter(c => c.status === 'active');
  const usedCodes = filteredCodes.filter(c => c.status === 'used');

  renderTable(elements.activeTableBody, activeCodes, false);
  renderTable(elements.usedTableBody, usedCodes, true);

  elements.activeCount.textContent = activeCodes.length;
  elements.usedCount.textContent = usedCodes.length;
}

function renderTable(tbody, codes, showUsedAt) {
  if (!tbody) return;

  if (codes.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center">
          <div class="empty-state">
            <p>暂无数据</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = codes.map(code => `
    <tr>
      <td><code>${code.code}</code></td>
      <td class="text-center">${code.points}</td>
      ${showUsedAt ? `<td>${formatDate(code.used_at)}</td>` : ''}
      <td class="text-right">
        <button class="btn btn-sm btn-danger" onclick="window.deleteCode('${code.code}')">
          删除
        </button>
      </td>
    </tr>
  `).join('');
}

async function handleGenerateCodes() {
  const specs = getBatchSpecs();

  if (specs.length === 0) {
    showToast('请添加生成规格', 'warning');
    return;
  }

  try {
    elements.generateBtn.disabled = true;
    elements.generateBtn.textContent = '生成中...';

    for (const spec of specs) {
      const result = await api.generateCodes(state.adminPassword, spec);
      showToast(`已生成 ${result.count} 张 ${spec.points} 点卡密`, 'success');
    }

    // 刷新数据
    await loadStats();
    await loadCodes();

    // 清空规格
    elements.batchSpecsContainer.innerHTML = '';
    addBatchSpec();

  } catch (err) {
    showToast('生成失败: ' + err.message, 'error');
  } finally {
    elements.generateBtn.disabled = false;
    elements.generateBtn.textContent = '生成全部';
  }
}

// ==================== 批量规格 ====================
function addBatchSpec() {
  const specHtml = `
    <div class="batch-spec">
      <div class="form-group">
        <label>点数</label>
        <input type="number" class="form-input spec-points" value="1" min="1" max="1000">
      </div>
      <div class="form-group">
        <label>数量</label>
        <input type="number" class="form-input spec-amount" value="10" min="1" max="1000">
      </div>
      <div class="form-group">
        <label>长度</label>
        <input type="number" class="form-input spec-length" value="8" min="4" max="20">
      </div>
      <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">
        删除
      </button>
    </div>
  `;

  elements.batchSpecsContainer?.insertAdjacentHTML('beforeend', specHtml);
}

function getBatchSpecs() {
  const specs = [];
  const specElements = elements.batchSpecsContainer?.querySelectorAll('.batch-spec') || [];

  specElements.forEach(el => {
    const points = parseInt(el.querySelector('.spec-points')?.value) || 1;
    const amount = parseInt(el.querySelector('.spec-amount')?.value) || 1;
    const codeLength = parseInt(el.querySelector('.spec-length')?.value) || 8;

    if (amount > 0) {
      specs.push({ points, amount, codeLength });
    }
  });

  return specs;
}

// ==================== 导出 ====================
async function handleExport() {
  try {
    const content = state.codes.map(c => `${c.code},${c.points},${c.status}`).join('\n');
    const blob = new Blob([`Code,Points,Status\n${content}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `codes_${Date.now()}.txt`;
    link.click();

    URL.revokeObjectURL(url);
    showToast('导出成功', 'success');

  } catch (err) {
    showToast('导出失败', 'error');
  }
}

// ==================== 删除卡密 ====================
window.deleteCode = async function(code) {
  if (!confirm(`确定要删除卡密 ${code} 吗？`)) return;

  try {
    await api.deleteCode(state.adminPassword, code);
    showToast('删除成功', 'success');

    await loadStats();
    await loadCodes();

  } catch (err) {
    showToast('删除失败: ' + err.message, 'error');
  }
};

// ==================== 工具函数 ====================
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN');
}

function showToast(message, type = 'info') {
  const container = document.querySelector('#toast-container') || createToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('toast-show');
  });

  setTimeout(() => {
    toast.classList.remove('toast-show');
    toast.classList.add('toast-hide');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toast-container';
  container.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 4000;
    display: flex;
    flex-direction: column;
    gap: 10px;
  `;
  document.body.appendChild(container);
  return container;
}

// ==================== 启动应用 ====================
document.addEventListener('DOMContentLoaded', init);
