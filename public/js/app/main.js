/**
 * 美式照���馆 - 主应用入口
 */
import { store } from './state.js';
import { api } from '../services/api.js';
import { config } from './config.js';

// 导入组件
import { Toast } from '../components/Toast.js';
import { PhotoUploader } from '../components/PhotoUploader.js';
import { StylePanel } from '../components/StylePanel.js';
import { CreditModal } from '../components/CreditModal.js';
import { ResultView } from '../components/ResultView.js';

// ==================== 主题管理 ====================
class ThemeManager {
  constructor() {
    this.storageKey = 'aps_theme';
    this.currentTheme = this.getStoredTheme() || this.getSystemTheme();
    this.init();
  }

  init() {
    // 应用初始主题
    this.applyTheme(this.currentTheme);

    // 监听系统主题变化（仅在用户未手动设置时）
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(this.storageKey)) {
        this.currentTheme = e.matches ? 'dark' : 'light';
        this.applyTheme(this.currentTheme);
      }
    });

    // 绑定切换按钮
    const toggleBtn = document.querySelector('#themeToggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggle());
    }
  }

  getStoredTheme() {
    return localStorage.getItem(this.storageKey);
  }

  getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    this.updateToggleIcon(theme);

    // 保存用户选择
    localStorage.setItem(this.storageKey, theme);
  }

  toggle() {
    this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(this.currentTheme);
  }

  updateToggleIcon(theme) {
    const toggleBtn = document.querySelector('#themeToggle');
    if (!toggleBtn) return;

    const sunIcon = toggleBtn.querySelector('.icon-sun');
    const moonIcon = toggleBtn.querySelector('.icon-moon');

    if (theme === 'dark') {
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'block';
    } else {
      sunIcon.style.display = 'block';
      moonIcon.style.display = 'none';
    }
  }
}

// ==================== 网络状态监控 ====================
class NetworkMonitor {
  constructor() {
    this.isOnline = navigator.onLine;
    this.offlineToastShown = false;
    this.init();
  }

  init() {
    // 监听在线/离线事件
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    // 初始状态检查
    if (!this.isOnline) {
      this.showOfflineMessage();
    }
  }

  handleOnline() {
    this.isOnline = true;
    this.offlineToastShown = false;
    store.showToast('网络已连接', 'success');
  }

  handleOffline() {
    this.isOnline = false;
    this.showOfflineMessage();
  }

  showOfflineMessage() {
    if (!this.offlineToastShown) {
      store.showToast('网络连接已断开，请检查网络设置', 'warning');
      this.offlineToastShown = true;
    }
  }

  isAvailable() {
    return this.isOnline;
  }
}

class App {
  constructor() {
    this.components = {};
    this.network = new NetworkMonitor();
    this.theme = new ThemeManager();
    this.init();
  }

  async init() {
    // 初始化组件
    this.initComponents();

    // 加载用户积分
    await this.loadCredits();

    // 订阅状态变化
    this.subscribeToState();

    console.log('App initialized');
  }

  initComponents() {
    // Toast ��器
    const toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
    this.components.toast = new Toast(toastContainer);

    // 主组件
    this.components.uploader = new PhotoUploader(
      document.querySelector('[data-component="uploader"]')
    );

    this.components.stylePanel = new StylePanel(
      document.querySelector('[data-component="style-panel"]')
    );

    this.components.creditModal = new CreditModal(
      document.querySelector('[data-component="credit-modal"]')
    );

    this.components.resultView = new ResultView(
      document.querySelector('[data-component="result-view"]')
    );

    // 绑定生成按钮
    const generateBtn = document.querySelector('#generateBtn');
    if (generateBtn) {
      generateBtn.addEventListener('click', () => this.handleGenerate());
    }

    // 绑定充值按钮
    const rechargeBtn = document.querySelector('#rechargeBtn');
    if (rechargeBtn) {
      rechargeBtn.addEventListener('click', () => {
        this.components.creditModal.open();
      });
    }

    // 绑定尺寸选择
    const ratioBtns = document.querySelectorAll('[data-ratio]');
    ratioBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const ratio = btn.dataset.ratio;
        this.handleRatioChange(ratio);

        ratioBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  /**
   * 加载用户积分（带降级处理）
   * 降级策略：
   * 1. 尝试从 API 加载
   * 2. 失败时从 localStorage 缓存读取
   * 3. 最后使用默认值 0
   */
  async loadCredits() {
    const deviceId = store.getState().user.deviceId;
    const cacheKey = `aps_credits_${deviceId}`;

    try {
      const result = await api.getCredits(deviceId);
      const credits = result.credits || 0;

      // 更新缓存
      localStorage.setItem(cacheKey, credits.toString());
      localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());

      store.setCredits(credits);
      return credits;
    } catch (err) {
      console.error('Load credits error:', err);

      // 降级策略1: 从缓存读取（5分钟内的缓存）
      const cached = localStorage.getItem(cacheKey);
      const cachedTime = localStorage.getItem(`${cacheKey}_timestamp`);
      const cacheAge = cachedTime ? Date.now() - parseInt(cachedTime) : Infinity;
      const CACHE_TTL = 5 * 60 * 1000; // 5分钟

      if (cached && cacheAge < CACHE_TTL) {
        const cachedCredits = parseInt(cached, 10) || 0;
        store.setCredits(cachedCredits);
        console.log('Using cached credits:', cachedCredits);
        return cachedCredits;
      }

      // 降级策略2: 使用默认值，但不阻断用户操作
      store.setCredits(0);

      // 仅在首次加载时显示提示（避免重复打扰）
      const wasLoaded = store.getState().user.creditsLoaded;
      if (!wasLoaded) {
        store.showToast('积分服务暂时不可用，可正常使用，生成时将提示充值', 'warning');
      }

      return 0;
    }
  }

  subscribeToState() {
    store.subscribe((newState, oldState) => {
      // 更新积分显示
      if (newState.user.credits !== oldState.user.credits) {
        this.updateCreditsDisplay(newState.user.credits);
      }

      // 显示 Toast
      if (newState.ui.toast !== oldState.ui.toast) {
        if (newState.ui.toast) {
          const { message, type = 'info' } = newState.ui.toast;
          this.components.toast.show(message, type);
        }
      }
    });
  }

  updateCreditsDisplay(credits) {
    const creditsEl = document.querySelector('#creditsDisplay');
    if (creditsEl) {
      creditsEl.textContent = credits;
    }
  }

  handleRatioChange(ratio) {
    store.setGenerateOption('aspectRatio', ratio);

    // 更新上传器尺寸
    const uploaderEl = document.querySelector('.photo-uploader');
    if (uploaderEl) {
      uploaderEl.dataset.ratio = ratio;
    }
  }

  async handleGenerate() {
    // 检查网络状态
    if (!this.network.isAvailable()) {
      store.showToast('网络未连接，请检查网络设置后重试', 'error');
      return;
    }

    // 检查是否正在加载
    if (this.components.resultView.isLoading()) {
      return;
    }

    // 检查是否有图片
    if (!this.components.uploader.hasFile()) {
      store.showToast('请先上传照片', 'warning');
      return;
    }

    // 检查积分
    const credits = store.getState().user.credits;
    if (credits < 1) {
      this.components.creditModal.open();
      return;
    }

    const imageBase64 = this.components.uploader.getBase64();
    const state = store.getState();
    const { options } = state.generate;
    const deviceId = state.user.deviceId;

    // 构建提示词
    const prompt = this.buildPrompt(options);

    try {
      store.setLoading(true);

      // 显示加载状态，传入取消回调
      this.components.resultView.showLoading(() => {
        // 取消时重新加载积分（后端会回滚）
        this.loadCredits();
      });

      // 获取 AbortSignal
      const signal = this.components.resultView.getAbortSignal();

      // 调用 API（传递 signal 以支持取消）
      const response = await api.generateImage(imageBase64, prompt, deviceId, options, { signal });

      // 显示结果 - 将 Response 转换为二进制数据
      const imageData = await response.arrayBuffer();
      this.components.resultView.showResult(imageData);

      // 更新积分
      await this.loadCredits();

      store.showToast('生成成功！', 'success');

    } catch (err) {
      // 如果是取消操作，不显示错误
      if (err.name === 'AbortError') {
        return;
      }

      this.components.resultView.hide();
      // 重新加载积分，确保显示正确（后端会回滚失败的扣费）
      await this.loadCredits();
      store.showToast(err.message || '生成失败，请稍后重试', 'error');
    } finally {
      store.setLoading(false);
    }
  }

  buildPrompt(options) {
    const parts = [];

    // 基础描述
    parts.push('professional American-style portrait photo');

    // 拍摄角度
    switch (options.angle) {
      case 'side':
        parts.push('slight side angle');
        break;
      default:
        parts.push('front-facing direct eye contact');
    }

    // 肤色处理
    switch (options.skinTone) {
      case 'brighten':
        parts.push('slightly brightened skin tone');
        break;
      default:
        parts.push('natural skin tone');
    }

    // 服装
    switch (options.outfit) {
      case 'business_casual':
        parts.push('wearing business casual attire');
        break;
      case 'academic':
        parts.push('wearing academic doctoral regalia');
        break;
      case 'original':
        parts.push('keeping original clothing');
        break;
      default:
        parts.push('wearing professional business suit');
    }

    // 背景
    switch (options.background) {
      case 'gray':
        parts.push('neutral gray background');
        break;
      case 'blue':
        parts.push('professional blue gradient background');
        break;
      case 'original':
        parts.push('original background');
        break;
      default:
        parts.push('clean white background');
    }

    // 质量描述
    parts.push('high quality studio lighting, sharp focus, professional photography');

    return parts.join(', ');
  }
}

// 启动应用
document.addEventListener('DOMContentLoaded', () => {
  new App();
});
