/**
 * 美式照相馆 - 主应用入口
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

class App {
  constructor() {
    this.components = {};
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

  async loadCredits() {
    const deviceId = store.getState().user.deviceId;

    try {
      const result = await api.getCredits(deviceId);
      store.setCredits(result.credits || 0);
    } catch (err) {
      console.error('Load credits error:', err);
      store.setCredits(0);
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
      this.components.resultView.showLoading();

      // 调用 API
      const response = await api.generateImage(imageBase64, prompt, deviceId, options);

      // 显示结果
      this.components.resultView.showResult(response);

      // 更新积分
      await this.loadCredits();

      store.showToast('生成成功！', 'success');

    } catch (err) {
      this.components.resultView.hide();
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
