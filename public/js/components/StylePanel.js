/**
 * 风格选择面��组件
 */
import { config } from '../app/config.js';
import { store } from '../app/state.js';

export class StylePanel {
  constructor(container) {
    this.container = container;
    this.render();
    this.bindEvents();
  }

  /**
   * 获取图标 SVG
   */
  getIconSvg(iconName) {
    const icons = {
      square: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="5" width="14" height="14" rx="1"/></svg>`,
      portrait: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="3" width="12" height="18" rx="1"/></svg>`,
      user: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M12 14c-4 0-6 2-6 4v2h12v-2c0-2-2-4-6-4z"/></svg>`,
      eye: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
      'user-side': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="8" r="4"/><path d="M10 14c-3.5 0-6 2-6 4v2h12v-2c0-2-2.5-4-6-4z"/><path d="M18 8l2-2M18 8l2 2"/></svg>`,
      sun: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
      sparkle: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4"/><circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.3"/></svg>`,
      suit: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3l-2 6v12h4v-5l4 3 4-3v5h4V9l-2-6H6z"/><path d="M8 3v4M16 3v4"/></svg>`,
      shirt: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.38 3.46L16 2 12 4 8 2 3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a2 2 0 0 0 1.58 1.66H5v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V10.82h.56a2 2 0 0 0 1.58-1.66l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg>`,
      graduation: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
      check: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>`,
      circle: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>`,
      image: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
    };
    return icons[iconName] || '';
  }

  /**
   * 获取颜色预览边框色
   */
  getBorderColor(color) {
    if (color === '#ffffff' || color === 'transparent') return '#e5e5e5';
    return color;
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
                      data-type="aspectRatio" data-value="${opt.value}"
                      title="${opt.hint || ''}">
                <span class="style-icon">${this.getIconSvg(opt.icon)}</span>
                <span class="style-option-content">
                  <span class="style-option-label">${opt.label}</span>
                  <span class="style-option-hint">${opt.hint || ''}</span>
                </span>
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
                      data-type="angle" data-value="${opt.value}"
                      title="${opt.hint || ''}">
                <span class="style-icon">${this.getIconSvg(opt.icon)}</span>
                <span class="style-option-content">
                  <span class="style-option-label">${opt.label}</span>
                  <span class="style-option-hint">${opt.hint || ''}</span>
                </span>
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
                      data-type="skinTone" data-value="${opt.value}"
                      title="${opt.hint || ''}">
                <span class="style-icon">${this.getIconSvg(opt.icon)}</span>
                <span class="style-option-content">
                  <span class="style-option-label">${opt.label}</span>
                  <span class="style-option-hint">${opt.hint || ''}</span>
                </span>
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
                      data-type="outfit" data-value="${opt.value}"
                      title="${opt.hint || ''}">
                <span class="style-icon">${this.getIconSvg(opt.icon)}</span>
                <span class="style-option-content">
                  <span class="style-option-label">${opt.label}</span>
                  <span class="style-option-hint">${opt.hint || ''}</span>
                </span>
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
                      data-type="background" data-value="${opt.value}"
                      title="${opt.hint || ''}">
                ${opt.color && opt.color !== 'transparent' ? `
                  <span class="color-preview" style="background: ${opt.color}; border-color: ${this.getBorderColor(opt.color)}"></span>
                ` : `
                  <span class="style-icon">${this.getIconSvg(opt.icon)}</span>
                `}
                <span class="style-option-content">
                  <span class="style-option-label">${opt.label}</span>
                  <span class="style-option-hint">${opt.hint || ''}</span>
                </span>
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
