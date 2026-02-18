/**
 * 图片上传组件
 */
import { config } from '../app/config.js';
import { store } from '../app/state.js';

// 图片尺寸限制
const MIN_DIMENSION = 512;
const MAX_DIMENSION = 4096;

export class PhotoUploader {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      maxSize: 4 * 1024 * 1024, // 4MB
      accept: 'image/jpeg,image/jpg,image/png,image/webp',
      ...options,
    };

    this.state = {
      file: null,
      preview: null,
      dragActive: false,
    };

    this.render();
    this.bindEvents();
  }

  render() {
    const { aspectRatio } = store.getState().generate.options;

    this.container.innerHTML = `
      <div class="photo-uploader" data-ratio="${aspectRatio}">
        <input type="file" id="fileInput" accept="${this.options.accept}" hidden>
        <div class="upload-area" id="uploadArea">
          <div class="upload-placeholder">
            <svg class="upload-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
            <p class="upload-text">点击上传或拖拽图片到这里</p>
            <div class="upload-hints">
              <p>• 支持格式：JPG、PNG、WEBP</p>
              <p>• 文件大小：≤ 4MB</p>
              <p>• 推荐尺寸：${MIN_DIMENSION}x${MIN_DIMENSION} ~ ${MAX_DIMENSION}x${MAX_DIMENSION} 像素</p>
            </div>
          </div>
          <div class="upload-preview" id="previewArea" style="display: none;">
            <img id="previewImage" src="" alt="预览">
            <button class="preview-remove" id="removeBtn" type="button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    const uploadArea = this.container.querySelector('#uploadArea');
    const fileInput = this.container.querySelector('#fileInput');
    const removeBtn = this.container.querySelector('#removeBtn');

    // 点击上传
    uploadArea.addEventListener('click', () => {
      if (!this.state.file) {
        fileInput.click();
      }
    });

    // 文件选择
    fileInput.addEventListener('change', (e) => {
      this.handleFileSelect(e.target.files[0]);
    });

    // 拖拽上传
    uploadArea.addEventListener('dragenter', (e) => {
      e.preventDefault();
      this.state.dragActive = true;
      uploadArea.classList.add('drag-active');
    });

    uploadArea.addEventListener('dragleave', (e) => {
      e.preventDefault();
      this.state.dragActive = false;
      uploadArea.classList.remove('drag-active');
    });

    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.state.dragActive = false;
      uploadArea.classList.remove('drag-active');

      const file = e.dataTransfer.files[0];
      this.handleFileSelect(file);
    });

    // 移除图片
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.clearFile();
    });
  }

  async handleFileSelect(file) {
    if (!file) return;

    // 验证文件类型
    if (!this.options.accept.includes(file.type)) {
      store.showToast('请上传 JPG、PNG 或 WEBP 格式的图片');
      return;
    }

    // 验证文件大小
    if (file.size > this.options.maxSize) {
      store.showToast('图片过大，请上传小于 4MB 的图片');
      return;
    }

    // 验证图片尺寸
    try {
      const dimensions = await this.getImageDimensions(file);

      if (dimensions.width < MIN_DIMENSION || dimensions.height < MIN_DIMENSION) {
        store.showToast(`图片尺寸过小，建议至少 ${MIN_DIMENSION}x${MIN_DIMENSION} 像素`);
        return;
      }

      if (dimensions.width > MAX_DIMENSION || dimensions.height > MAX_DIMENSION) {
        store.showToast(`图片尺寸过大，建议不超过 ${MAX_DIMENSION}x${MAX_DIMENSION} 像素`);
        return;
      }
    } catch (err) {
      store.showToast('图片读取失败，请重试');
      console.error('Image dimension check error:', err);
      return;
    }

    // 读取预览
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target.result;

      this.state.file = file;
      this.state.preview = preview;

      // 更新 UI
      this.container.querySelector('.upload-placeholder').style.display = 'none';
      this.container.querySelector('.upload-preview').style.display = 'flex';
      this.container.querySelector('#previewImage').src = preview;

      // 更新状态
      store.setGenerateFile(file, preview);
    };

    reader.readAsDataURL(file);
  }

  /**
   * 获取图片尺寸
   */
  getImageDimensions(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.width, height: img.height });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  clearFile() {
    this.state.file = null;
    this.state.preview = null;

    this.container.querySelector('.upload-placeholder').style.display = 'block';
    this.container.querySelector('.upload-preview').style.display = 'none';
    this.container.querySelector('#fileInput').value = '';

    store.setGenerateFile(null, null);
  }

  getBase64() {
    return this.state.preview;
  }

  hasFile() {
    return !!this.state.file;
  }
}
