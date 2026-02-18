/**
 * 风格选择面板组件
 */
import { config } from '../app/config.js';
import { store } from '../app/state.js';

export class StylePanel {
  constructor(container) {
    this.container = container;
    this.render();
    this.bindEvents();
  }

  render() {
    const state = store.getState();
    const options = state.generate.options;

    this.container.innerHTML = `
      <div class="style-panel">
        <h3 class="panel-title">风格定制</h3>

        <!-- 图片比例 -->
        <div class="style-group">
          <label class="style-label">图片比例</label>
          <div class="style-options ratio-options">
            ${Object.values(config.aspectRatios).map(opt => `
              <button class="style-option ${options.aspectRatio === opt.value ? 'active' : ''}"
                      data-type="aspectRatio" data-value="${opt.value}">
                ${opt.label}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- 拍摄角度 -->
        <div class="style-group">
          <label class="style-label">拍摄角度</label>
          <div class="style-options">
            ${Object.values(config.angles).map(opt => `
              <button class="style-option ${options.angle === opt.value ? 'active' : ''}"
                      data-type="angle" data-value="${opt.value}">
                ${opt.label}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- 肤色处理 -->
        <div class="style-group">
          <label class="style-label">肤色处理</label>
          <div class="style-options">
            ${Object.values(config.skinTones).map(opt => `
              <button class="style-option ${options.skinTone === opt.value ? 'active' : ''}"
                      data-type="skinTone" data-value="${opt.value}">
                ${opt.label}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- 智能换装 -->
        <div class="style-group">
          <label class="style-label">智能换装</label>
          <div class="style-options">
            ${Object.values(config.outfits).map(opt => `
              <button class="style-option ${options.outfit === opt.value ? 'active' : ''}"
                      data-type="outfit" data-value="${opt.value}">
                ${opt.label}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- 背景色调 -->
        <div class="style-group">
          <label class="style-label">背景色调</label>
          <div class="style-options">
            ${Object.values(config.backgrounds).map(opt => `
              <button class="style-option ${options.background === opt.value ? 'active' : ''}"
                      data-type="background" data-value="${opt.value}">
                ${opt.label}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    this.container.querySelectorAll('.style-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        const value = btn.dataset.value;

        // 更新 UI
        this.container.querySelectorAll(`[data-type="${type}"]`).forEach(b => {
          b.classList.remove('active');
        });
        btn.classList.add('active');

        // 更新状态
        store.setGenerateOption(type, value);

        // 如果是比例变化，需要更新上传器的比例
        if (type === 'aspectRatio') {
          this.updateUploaderRatio(value);
        }
      });
    });
  }

  /**
   * 更新上传器的比例
   */
  updateUploaderRatio(ratio) {
    const uploaderContainer = document.querySelector('[data-component="uploader"]');
    if (uploaderContainer) {
      const uploader = uploaderContainer.querySelector('.photo-uploader');
      if (uploader) {
        uploader.dataset.ratio = ratio;
      }
    }
  }
}
