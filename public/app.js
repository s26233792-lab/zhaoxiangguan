// ==================== 配置 ====================
const config = {
  isAdmin: false,
  credits: 0,
  isGenerating: false,
  currentRatio: 1,           // 照片比例
  selectedSkin: 'beautify',  // 肤色处理: beautify(美颜) / natural(自然)
  selectedAngle: 'front',    // 角度: front(正面) / tilted(微侧)
  selectedClothing: 'Business Formal', // 服���
  selectedColor: 'Studio White',
  imageBase64: null,
  abortController: null
};

// ==================== 工具函数 ====================

// 生成设备ID
function getDeviceId() {
  let deviceId = localStorage.getItem('american_photo_device_id');
  if (!deviceId) {
    deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('american_photo_device_id', deviceId);
  }
  return deviceId;
}

// 显示提示消息
function showStatus(message, type = 'info') {
  const el = document.getElementById('status-message');
  const text = document.getElementById('status-text');
  text.textContent = message;
  el.className = `status-message ${type}`;
  setTimeout(() => el.classList.add('hidden'), 3000);
}

// ==================== 增强的 Toast 系统 ====================
class ToastManager {
  constructor() {
    this.toasts = [];
    this.container = null;
    this.initContainer();
  }

  initContainer() {
    // 检查是否已存在容器
    this.container = document.querySelector('.toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  }

  show(message, type = 'info', options = {}) {
    const toast = document.createElement('div');
    toast.className = `status-message ${type}`;

    const icons = {
      success: '<i class="fas fa-check-circle icon"></i>',
      error: '<i class="fas fa-exclamation-circle icon"></i>',
      info: '<i class="fas fa-info-circle icon"></i>',
      warning: '<i class="fas fa-exclamation-triangle icon"></i>'
    };

    let html = `${icons[type] || icons.info}`;
    html += `<span class="content">${message}</span>`;

    if (options.action) {
      html += `<span class="action" onclick="${options.action.onclick}">${options.action.text}</span>`;
    }

    toast.innerHTML = html;

    this.container.appendChild(toast);
    this.toasts.push(toast);

    // 自动移除
    const duration = options.duration || 3000;
    setTimeout(() => this.remove(toast), duration);

    // 点击关闭
    toast.onclick = (e) => {
      if (!e.target.classList.contains('action')) {
        this.remove(toast);
      }
    };

    return toast;
  }

  remove(toast) {
    toast.classList.add('toast-exit');
    setTimeout(() => {
      toast.remove();
      this.toasts = this.toasts.filter(t => t !== toast);
    }, 300);
  }

  success(message, options = {}) {
    return this.show(message, 'success', options);
  }

  error(message, options = {}) {
    return this.show(message, 'error', { ...options, duration: 5000 });
  }

  info(message, options = {}) {
    return this.show(message, 'info', options);
  }

  warning(message, options = {}) {
    return this.show(message, 'warning', options);
  }
}

// 初始化 Toast 管理器
const toast = new ToastManager();

// 打开/关闭模态框
function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

// ==================== 波纹效果 ====================
function createRipple(event, element, type = 'default') {
  const ripple = document.createElement('span');
  const rect = element.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;

  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  ripple.className = `ripple ${type === 'success' ? 'ripple-success' : type === 'error' ? 'ripple-error' : ''}`;

  element.appendChild(ripple);

  setTimeout(() => ripple.remove(), 600);
}

// 为所有交互元素附加波纹效果
function attachRippleEffects() {
  const interactiveElements = document.querySelectorAll('.btn, .size-btn, .option-btn, .clothing-btn, .color-swatch');

  interactiveElements.forEach(element => {
    element.addEventListener('click', (e) => {
      createRipple(e, element);
    });
  });
}

// ==================== API 客户端 ====================
const API = {
  // 查询积分
  async getCredits() {
    const deviceId = getDeviceId();
    const res = await fetch(`/api/credits?deviceId=${deviceId}`);
    return await res.json();
  },

  // 充值积分
  async redeemCode(code) {
    const deviceId = getDeviceId();
    const res = await fetch('/api/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, deviceId })
    });
    return await res.json();
  },

  // 生成图片
  async generateImage(image, prompt, signal) {
    const deviceId = getDeviceId();
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, prompt, deviceId }),
      signal
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || '生成失败');
    }
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },

  // 管理员：获取统计
  async getStats(adminPassword) {
    const res = await fetch(`/api/stats`);
    return await res.json();
  },

  // 管理员：生成卡密
  async generateCodes(points, amount, length, adminPassword) {
    const res = await fetch('/api/generate-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points, amount, codeLength: length, adminPassword })
    });
    return await res.json();
  },

  // 管理员：获取卡密列表
  async getCodes(adminPassword, status = 'all', limit = 100, offset = 0) {
    const res = await fetch(`/api/generate-codes?adminPassword=${adminPassword}&status=${status}&limit=${limit}&offset=${offset}`);
    return await res.json();
  }
};

// ==================== 积分管理 ====================
async function loadCredits() {
  const data = await API.getCredits();
  config.credits = data.credits || 0;
  document.getElementById('credit-count').textContent = config.credits;
}

async function redeemCode() {
  const input = document.getElementById('code-input');
  const code = input.value.trim();
  const btn = document.getElementById('redeem-btn');

  if (!code) {
    showStatus('请输入验证码', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = '充值中...';

  try {
    const data = await API.redeemCode(code);
    if (data.success) {
      showStatus(data.message, 'success');
      await loadCredits();
      input.value = '';
      closeModal('credit-modal');
    } else {
      showStatus(data.error || '充值失败', 'error');
    }
  } catch (err) {
    showStatus('充值失败，请检查网络', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '充值';
  }
}

// ==================== 风格选项选择 ====================

// 选择照片尺寸
function selectSize(btn, ratio) {
  document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  config.currentRatio = ratio;

  // 更新上传区域比例
  const wrapper = document.getElementById('upload-wrapper');
  wrapper.style.aspectRatio = `${ratio}`;
}

// 选择风格选项
function selectOption(type, btn, value) {
  // 移除同类按钮的active状态
  document.querySelectorAll(`.${type}-btn`).forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  // 更新配置
  if (type === 'angle') {
    config.selectedAngle = value;
  } else if (type === 'skin') {
    config.selectedSkin = value;
    // 更新描述文字
    const desc = document.getElementById('skin-desc');
    if (value === 'beautify') {
      desc.textContent = '轻微美颜，肤色提亮';
    } else {
      desc.textContent = '肤色真实自然，保持五官一致';
    }
  } else if (type === 'clothing') {
    config.selectedClothing = value;
  }
}

// 选择背景颜色
function selectColor(el, color, name) {
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
  el.classList.add('active');
  config.selectedColor = color;
  document.getElementById('selected-color').value = color;
  document.getElementById('color-name').textContent = `当前: ${name}`;
}

// ==================== 构建提示词 ====================
function buildPrompt() {
  // 肤色处理提示词
  const skinPrompt = config.selectedSkin === 'beautify'
    ? '轻微美颜，肤色提亮'
    : '肤色真实自然，保持五官一致';

  // 角度提示词
  const anglePrompt = config.selectedAngle === 'front'
    ? '正面对视，证件照风格'
    : '微微倾斜，自然自信';

  // 服装提示词
  let clothingPrompt;
  if (config.selectedClothing === 'Keep Original') {
    clothingPrompt = '保持原样，仅优化光影和颜色';
  } else if (config.selectedClothing === 'Academic Doctoral Regalia') {
    clothingPrompt = '美式 PhD 博士礼服长袍，带天鹅绒饰边，不戴帽子/学位帽';
  } else if (config.selectedClothing === 'Business Casual') {
    clothingPrompt = '商务休闲装，休闲衬衫或休闲西装，轻松专业风格';
  } else {
    clothingPrompt = '商务正装，高端西装或职业套装';
  }

  // 背景颜色映射
  const colorMap = {
    'Studio White': '纯净白色',
    'Classic Grey': '经典灰色',
    'Deep Navy Blue': '海军蓝色',
    'Professional Warm Tone': '暖色调'
  };

  return `将上传的人像轉換為美式專業職場風格肖像照。

风格: 美式专业职场风格肖像照，LinkedIn/Forbes 专业商务肖像

人物: 保持清晰對焦，構圖干净优雅。身体姿势要像军人那样挺拔，宽肩部

肤色: ${skinPrompt}

角度: ${anglePrompt}

服装: ${clothingPrompt}

背景: 質量影棚背景，柔和自然光，略微虚化。颜色: ${colorMap[config.selectedColor] || '纯净白色'}

输出: 高清，2K

保持面部特征、种族和身份一致性，不要超出指定风格改变人物外观`;
}

// ==================== 图片上传 ====================
function handleFileUpload(file) {
  if (!file || !file.type.startsWith('image/')) {
    showStatus('请上传图片文件', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    config.imageBase64 = e.target.result;
    document.getElementById('preview-img').src = config.imageBase64;
    document.getElementById('preview-upload').classList.remove('hidden');
    document.getElementById('upload-placeholder').classList.add('hidden');
  };
  reader.readAsDataURL(file);
}

function removeImage() {
  config.imageBase64 = null;
  document.getElementById('preview-img').src = '';
  document.getElementById('preview-upload').classList.add('hidden');
  document.getElementById('upload-placeholder').classList.remove('hidden');
  document.getElementById('file-input').value = '';
}

// ==================== 庆祝效果 ====================
function celebrateSuccess() {
  // 创建五彩纸屑
  const container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);

  const colors = ['#1B4D3E', '#D4A574', '#C8102E', '#2D7A3E', '#FFD700'];

  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = Math.random() * 100 + 'vw';
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.animationDelay = Math.random() * 2 + 's';
    confetti.style.animationDuration = (2 + Math.random() * 2) + 's';

    // 随机形状
    if (Math.random() > 0.5) {
      confetti.style.borderRadius = '50%';
    }

    container.appendChild(confetti);
  }

  // 动画结束后清理
  setTimeout(() => container.remove(), 5000);
}

function showSuccessAnimation(element) {
  element.classList.add('success-pulse');
  setTimeout(() => element.classList.remove('success-pulse'), 600);
}

// ==================== 图片生成 ====================
async function generateImage() {
  if (config.isGenerating) {
    if (confirm('取消生成？')) {
      if (config.abortController) config.abortController.abort();
      resetGenerateUI();
    }
    return;
  }

  if (config.credits < 1) {
    showStatus('积分不足，请先充值', 'error');
    openModal('credit-modal');
    return;
  }

  if (!config.imageBase64) {
    showStatus('请先上传图片', 'error');
    return;
  }

  // 构建提示词
  const prompt = buildPrompt();

  config.isGenerating = true;
  config.abortController = new AbortController();

  const genBtn = document.getElementById('generate-btn');
  genBtn.innerHTML = '<span>取消生成</span> <i class="fas fa-stop"></i>';
  genBtn.classList.add('btn-danger');

  document.getElementById('loading-state').classList.remove('hidden');
  document.getElementById('result-placeholder').classList.add('hidden');
  document.getElementById('result-image-wrapper').classList.add('hidden');
  document.getElementById('result-image').classList.add('hidden');

  // 进度动画
  let progress = 0;
  const progressBar = document.getElementById('progress-bar');
  const progressContainer = document.querySelector('.progress-bar');
  const percentText = document.getElementById('percent-text');
  const tips = ['正在构建3D面部', '优化伦勃朗光影', '适配服装材质', '正在生成 2K 原图'];
  const loadingTip = document.getElementById('loading-tip');

  // 添加进度条激活状态
  if (progressContainer) progressContainer.classList.add('active');

  const progressTimer = setInterval(() => {
    if (progress < 90) {
      progress += Math.random() * 3;
      progressBar.style.width = `${progress}%`;
      percentText.textContent = `${Math.floor(progress)}%`;

      // 更新提示
      const tipIndex = Math.min(Math.floor(progress / 22), tips.length - 1);
      loadingTip.textContent = tips[tipIndex];
    }
  }, 400);

  try {
    const resultUrl = await API.generateImage(config.imageBase64, prompt, config.abortController.signal);

    const resultImg = document.getElementById('result-image');
    const resultWrapper = document.getElementById('result-image-wrapper');
    resultImg.src = resultUrl;
    resultWrapper.classList.remove('hidden');
    resultImg.classList.remove('hidden');
    document.getElementById('result-placeholder').classList.add('hidden');
    document.getElementById('download-btn').disabled = false;

    progressBar.style.width = '100%';
    percentText.textContent = '100%';
    loadingTip.textContent = '生成完成';

    showStatus('生成成功！已消耗 1 点数', 'success');

    // 触发庆祝动画
    celebrateSuccess();
    showSuccessAnimation(resultWrapper);

    await loadCredits();

    setTimeout(() => {
      document.getElementById('loading-state').classList.add('hidden');
      if (progressContainer) progressContainer.classList.remove('active');
      resetGenerateUI();
    }, 500);

  } catch (err) {
    showStatus(`生成失败: ${err.message}`, 'error');
    if (progressContainer) progressContainer.classList.remove('active');
    resetGenerateUI();
  } finally {
    clearInterval(progressTimer);
  }
}

function resetGenerateUI() {
  config.isGenerating = false;
  const genBtn = document.getElementById('generate-btn');
  genBtn.innerHTML = '<span>生成证件照</span> <i class="fas fa-wand-magic-sparkles"></i>';
  genBtn.classList.remove('btn-danger');
}

// ==================== 下载图片 ====================
function downloadImage() {
  const resultImg = document.getElementById('result-image');
  if (resultImg.src) {
    const a = document.createElement('a');
    a.href = resultImg.src;
    a.download = `american_photo_${Date.now()}.jpg`;
    a.click();
  }
}

// ==================== 返回顶部按钮 ====================
function initScrollToTop() {
  const scrollBtn = document.getElementById('scroll-to-top');

  if (!scrollBtn) return;

  // 根据滚动位置显示/隐藏
  window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
      scrollBtn.classList.add('visible');
    } else {
      scrollBtn.classList.remove('visible');
    }
  }, { passive: true });

  // 点击滚动到顶部
  scrollBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

// ==================== 移动端手势 ====================
let touchStartX = 0;
let touchStartY = 0;

function initTouchGestures() {
  // 左滑删除图片
  const previewUpload = document.getElementById('preview-upload');

  if (previewUpload) {
    previewUpload.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    previewUpload.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;
      handleSwipeGesture(previewUpload);
    }, { passive: true });
  }
}

function handleSwipeGesture(previewElement) {
  const deltaX = touchEndX - touchStartX;
  const deltaY = touchEndY - touchStartY;

  // 水平滑动（左或右）
  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
    if (deltaX < 0 && config.imageBase64) {
      // 左滑删除
      previewElement.style.transform = `translateX(${deltaX}px)`;
      previewElement.style.opacity = '0';

      setTimeout(() => {
        removeImage();
        previewElement.style.transform = '';
        previewElement.style.opacity = '';
      }, 200);
    }
  }
}

// ==================== 管理后台 ====================
// 规格管理变量
let specItems = []; // 存储规格配置 [{points: 1, amount: 10}, ...]

async function adminLogin() {
  const password = document.getElementById('admin-password').value;
  if (!password) {
    showStatus('请输入管理员密码', 'error');
    return;
  }

  // 登录成功（实际验证在后端API调用时）
  config.isAdmin = true;
  localStorage.setItem('admin_password', password);
  document.getElementById('login-panel').classList.add('hidden');
  document.getElementById('admin-panel').classList.remove('hidden');
  showStatus('登录成功', 'success');

  // 加载数据
  await loadAdminData();
  await loadCodesList();
}

async function loadAdminData() {
  try {
    const stats = await API.getStats();
    document.getElementById('stat-total-codes').textContent = stats.totalCodes || 0;
    document.getElementById('stat-active-codes').textContent = stats.activeCodes || 0;
    document.getElementById('stat-users').textContent = stats.totalUsers || 0;
  } catch (err) {
    showStatus('加载数据失败', 'error');
  }
}

// 规格管理函数
function addSpec() {
  const index = specItems.length;
  specItems.push({ points: 1, amount: 10 });

  const container = document.getElementById('batch-specs-container');
  const specHtml = `
    <div class="spec-item" data-index="${index}">
      <div class="spec-row">
        <div class="form-group">
          <label>点数</label>
          <select class="input spec-points" onchange="updateSpec(${index}, 'points', this.value)">
            <option value="1" selected>1点</option>
            <option value="5">5点</option>
            <option value="10">10点</option>
            <option value="20">20点</option>
            <option value="50">50点</option>
          </select>
        </div>
        <div class="form-group">
          <label>数量</label>
          <input type="number" class="input spec-amount" value="10" min="1" max="1000"
                 onchange="updateSpec(${index}, 'amount', this.value)">
        </div>
        <button class="btn btn-small btn-danger" onclick="removeSpec(${index})">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', specHtml);
}

function removeSpec(index) {
  specItems.splice(index, 1);
  const item = document.querySelector(`.spec-item[data-index="${index}"]`);
  if (item) item.remove();
  // 重新索引
  document.querySelectorAll('.spec-item').forEach((el, i) => {
    el.dataset.index = i;
    // 更新事件处理器
    el.querySelector('.spec-points').onchange = function() { updateSpec(i, 'points', this.value); };
    el.querySelector('.spec-amount').onchange = function() { updateSpec(i, 'amount', this.value); };
    el.querySelector('.btn-danger').onclick = function() { removeSpec(i); };
  });
}

function updateSpec(index, field, value) {
  specItems[index][field] = parseInt(value);
}

// 批量生成卡密
async function generateCodes() {
  if (specItems.length === 0) {
    showStatus('请先添加生成规格', 'error');
    return;
  }

  const totalAmount = specItems.reduce((sum, spec) => sum + spec.amount, 0);
  if (!confirm(`确定生成 ${totalAmount} 张卡密？`)) return;

  const btn = document.getElementById('generate-codes-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 生成中...';

  try {
    const adminPassword = localStorage.getItem('admin_password');
    if (!adminPassword) {
      showStatus('请先登录', 'error');
      return;
    }

    // 依次生成各规格
    for (const spec of specItems) {
      const data = await API.generateCodes(spec.points, spec.amount, 8, adminPassword);
      if (!data.success) {
        showStatus(`${spec.points}点卡密生成失败: ${data.error}`, 'error');
      }
    }

    showStatus(`成功生成 ${totalAmount} 张卡密`, 'success');
    await loadAdminData();
    await loadCodesList();

    // 清空规格列表并添加一个默认规格
    specItems = [];
    document.getElementById('batch-specs-container').innerHTML = '';
    addSpec();

  } catch (err) {
    showStatus('生成失败', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-magic"></i> 生成全部';
  }
}

async function loadCodesList() {
  try {
    const adminPassword = localStorage.getItem('admin_password');
    const data = await API.getCodes(adminPassword, 'all', 10000, 0);

    const activeCodes = data.codes.filter(c => c.status === 'active');
    const usedCodes = data.codes.filter(c => c.status === 'used');

    // 更新计数
    document.getElementById('active-count').textContent = activeCodes.length;
    document.getElementById('used-count').textContent = usedCodes.length;

    // 渲染可用卡密
    const activeTbody = document.getElementById('active-table-body');
    if (activeCodes.length === 0) {
      activeTbody.innerHTML = '<tr><td colspan="3" class="text-center">暂无数据</td></tr>';
    } else {
      activeTbody.innerHTML = activeCodes.map(code => `
        <tr>
          <td><code>${code.code}</code></td>
          <td>${code.points}</td>
          <td>
            <button class="btn btn-small btn-secondary" onclick="copyCode('${code.code}')">
              <i class="fas fa-copy"></i>
            </button>
            <button class="btn btn-small btn-danger" onclick="deleteCode('${code.code}')">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `).join('');
    }

    // 渲染已使用卡密
    const usedTbody = document.getElementById('used-table-body');
    if (usedCodes.length === 0) {
      usedTbody.innerHTML = '<tr><td colspan="4" class="text-center">暂无数据</td></tr>';
    } else {
      usedTbody.innerHTML = usedCodes.map(code => `
        <tr>
          <td><code>${code.code}</code></td>
          <td>${code.points}</td>
          <td>${new Date(code.used_at).toLocaleString()}</td>
          <td>
            <button class="btn btn-small btn-secondary" onclick="copyCode('${code.code}')">
              <i class="fas fa-copy"></i>
            </button>
          </td>
        </tr>
      `).join('');
    }

  } catch (err) {
    showStatus('加载失败', 'error');
  }
}

// 折叠/展开分区
function toggleSection(type) {
  const section = document.getElementById(`${type}-section`);
  const header = section.previousElementSibling;
  const toggle = header.querySelector('.section-toggle');

  section.classList.toggle('collapsed');
  toggle.classList.toggle('fa-chevron-down');
  toggle.classList.toggle('fa-chevron-right');
}

function copyCode(code) {
  navigator.clipboard.writeText(code);
  showStatus('已复制', 'success');
}

// 导出为 TXT
async function exportToTxt() {
  try {
    const adminPassword = localStorage.getItem('admin_password');
    const data = await API.getCodes(adminPassword, 'all', 10000, 0);

    if (!data.codes || data.codes.length === 0) {
      showStatus('没有可导出的卡密', 'error');
      return;
    }

    let txtContent = `=== 美式照相馆卡密列表 ===\n`;
    txtContent += `导出时间: ${new Date().toLocaleString()}\n`;
    txtContent += `总数: ${data.codes.length}\n\n`;

    const activeCodes = data.codes.filter(c => c.status === 'active');
    const usedCodes = data.codes.filter(c => c.status === 'used');

    txtContent += `--- 可用卡密 (${activeCodes.length}) ---\n`;
    activeCodes.forEach(code => {
      txtContent += `${code.code}  |  ${code.points}点\n`;
    });

    txtContent += `\n--- 已使用卡密 (${usedCodes.length}) ---\n`;
    usedCodes.forEach(code => {
      txtContent += `${code.code}  |  ${code.points}点  |  ${new Date(code.used_at).toLocaleString()}\n`;
    });

    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `卡密列表_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    showStatus('导出成功', 'success');
  } catch (err) {
    showStatus('导出失败', 'error');
  }
}

// 删除单个卡密
async function deleteCode(code) {
  if (!confirm(`确定删除卡密 ${code}？`)) return;

  try {
    const adminPassword = localStorage.getItem('admin_password');
    const response = await fetch('/api/delete-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, adminPassword })
    });

    const data = await response.json();

    if (data.success) {
      showStatus('删除成功', 'success');
      await loadCodesList();
      await loadAdminData();
    } else {
      showStatus(data.error || '删除失败', 'error');
    }
  } catch (err) {
    showStatus('删除失败', 'error');
  }
}

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
  // 附加波纹效果
  attachRippleEffects();

  // 初始化返回顶部按钮
  initScrollToTop();

  // 初始化移动端手势
  initTouchGestures();

  // 检查是否是管理页面
  const isAdminPage = document.body.classList.contains('admin-page');

  if (!isAdminPage) {
    // 用户页面初始化
    loadCredits();

    // 文件上传
    document.getElementById('file-input').addEventListener('change', (e) => {
      if (e.target.files[0]) handleFileUpload(e.target.files[0]);
    });

    document.getElementById('upload-wrapper').addEventListener('click', (e) => {
      if (e.target === document.getElementById('upload-wrapper') ||
          e.target === document.getElementById('upload-placeholder')) {
        document.getElementById('file-input').click();
      }
    });

    document.getElementById('upload-wrapper').addEventListener('dragover', (e) => {
      e.preventDefault();
      document.getElementById('upload-wrapper').classList.add('drag-over');
    });

    document.getElementById('upload-wrapper').addEventListener('dragleave', () => {
      document.getElementById('upload-wrapper').classList.remove('drag-over');
    });

    document.getElementById('upload-wrapper').addEventListener('drop', (e) => {
      e.preventDefault();
      document.getElementById('upload-wrapper').classList.remove('drag-over');
      if (e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0]);
    });

    document.getElementById('remove-image').addEventListener('click', removeImage);

    // 生成图片
    document.getElementById('generate-btn').addEventListener('click', generateImage);

    // 下载图片
    document.getElementById('download-btn').addEventListener('click', downloadImage);

    // 充值
    document.getElementById('redeem-btn').addEventListener('click', redeemCode);
  } else {
    // 管理页面初始化
    document.getElementById('login-btn').addEventListener('click', adminLogin);
    document.getElementById('add-spec-btn').addEventListener('click', addSpec);
    document.getElementById('generate-codes-btn').addEventListener('click', generateCodes);
    document.getElementById('refresh-btn').addEventListener('click', loadCodesList);
    document.getElementById('export-btn').addEventListener('click', exportToTxt);

    // 默认添加一个规格
    addSpec();
  }
});
