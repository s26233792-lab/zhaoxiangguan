/**
 * 生成结果展示组件
 */
import { store } from '../app/state.js';

export class ResultView {
  constructor(container) {
    this.container = container;
    this.state = {
      loading: false,
      progress: 0,
      result: null,
    };

    // 用于取消请求的 AbortController
    this.abortController = null;
    this.onCancelCallback = null;

    this.render();
    this.bindEvents();
  }

  render() {
    this.container.innerHTML = `
      <div class="result-view" id="resultView" style="display: none;">
        <div class="result-loading" id="resultLoading" style="display: none;">
          <div class="loading-spinner"></div>
          <p class="loading-text">AI 正在生成中...</p>
          <div class="loading-progress">
            <div class="loading-progress-bar" id="progressBar" style="width: 0%;"></div>
          </div>
          <button class="btn btn-outline btn-cancel" id="cancelBtn" type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            取消生成
          </button>
        </div>

        <div class="result-content" id="resultContent" style="display: none;">
          <img id="resultImage" src="" alt="生成结果">
          <div class="result-actions">
            <button class="btn btn-secondary" id="downloadBtn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              下载图片
            </button>
            <button class="btn btn-primary" id="regenerateBtn">重新生成</button>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // 取消按钮事件
    const cancelBtn = this.container.querySelector('#cancelBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.cancel());
    }
  }

  /**
   * 显示加载状态
   * @param {Function} onCancel - 取消回调函数
   */
  showLoading(onCancel = null) {
    // 创建新的 AbortController
    this.abortController = new AbortController();
    this.onCancelCallback = onCancel;

    this.state.loading = true;
    this.state.progress = 0;

    this.container.querySelector('#resultView').style.display = 'block';
    this.container.querySelector('#resultLoading').style.display = 'block';
    this.container.querySelector('#resultContent').style.display = 'none';
    this.container.querySelector('#cancelBtn').style.display = 'inline-flex';

    // 模拟进度
    const progressBar = this.container.querySelector('#progressBar');
    this.progressInterval = setInterval(() => {
      this.state.progress += Math.random() * 15;
      if (this.state.progress > 90) {
        this.state.progress = 90;
      }
      progressBar.style.width = this.state.progress + '%';
    }, 500);
  }

  /**
   * 取消生成
   */
  cancel() {
    if (this.abortController) {
      // 触发取消信号
      this.abortController.abort();

      // 调用取消回调
      if (this.onCancelCallback) {
        this.onCancelCallback();
      }
    }

    this.hide();
    store.showToast('已取消生成', 'info');
  }

  /**
   * 获取 AbortController signal（用于外部请求）
   */
  getAbortSignal() {
    return this.abortController ? this.abortController.signal : null;
  }

  showResult(imageData) {
    clearInterval(this.progressInterval);
    this.state.loading = false;
    this.state.progress = 100;

    this.container.querySelector('#resultLoading').style.display = 'none';
    this.container.querySelector('#resultContent').style.display = 'block';

    const resultImage = this.container.querySelector('#resultImage');
    resultImage.src = URL.createObjectURL(new Blob([imageData], { type: 'image/jpeg' }));

    // 绑定下载按钮
    this.container.querySelector('#downloadBtn').onclick = () => {
      const link = document.createElement('a');
      link.href = resultImage.src;
      link.download = `american-portrait-${Date.now()}.jpg`;
      link.click();
    };

    // 绑定重新生成按钮
    this.container.querySelector('#regenerateBtn').onclick = () => {
      this.hide();
    };
  }

  hide() {
    clearInterval(this.progressInterval);
    this.state.loading = false;
    this.state.result = null;
    this.container.querySelector('#resultView').style.display = 'none';
  }

  isLoading() {
    return this.state.loading;
  }
}
