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

    this.render();
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

  showLoading() {
    this.state.loading = true;
    this.state.progress = 0;

    this.container.querySelector('#resultView').style.display = 'block';
    this.container.querySelector('#resultLoading').style.display = 'block';
    this.container.querySelector('#resultContent').style.display = 'none';

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
