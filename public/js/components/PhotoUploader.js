/**
 * 图片上传组件
 */
import { config } from '../app/config.js';
import { store } from '../app/state.js';

// 图片尺寸限制
const MIN_DIMENSION = 512;
const MAX_DIMENSION = 4096;

// 图片压缩配置
const COMPRESSION_CONFIG = {
  maxWidth: 2048,
  maxHeight: 2048,
  quality: 0.9,
  maxFileSize: 3 * 1024 * 1024, // 3MB 目标大小
};

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
      uploading: false,
      uploadProgress: 0,
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
          <!-- 上传进度条 -->
          <div class="upload-progress" id="uploadProgress" style="display: none;">
            <div class="progress-bar">
              <div class="progress-fill" id="progressFill" style="width: 0%"></div>
            </div>
            <p class="progress-text" id="progressText">0%</p>
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

    // 验证文件大小（允许更大的文件，会压缩）
    if (file.size > this.options.maxSize * 2) {
      store.showToast(`图片过大，请上传小于 ${this.options.maxSize / 1024 / 1024 * 2}MB 的图片`);
      return;
    }

    // 显示处理中状态
    this.showProgress('正在处理图片...');
    this.updateProgress(10);

    // 加载图片
    let img;
    try {
      img = await this.loadImage(file);
      this.updateProgress(30);
    } catch (err) {
      this.hideProgress();
      store.showToast('图片读取失败，请重试');
      console.error('Image load error:', err);
      return;
    }

    // 验证图片尺寸
    const dimensions = { width: img.width, height: img.height };

    if (dimensions.width < MIN_DIMENSION || dimensions.height < MIN_DIMENSION) {
      this.hideProgress();
      store.showToast(`图片尺寸过小，建议至少 ${MIN_DIMENSION}x${MIN_DIMENSION} 像素`);
      return;
    }

    if (dimensions.width > MAX_DIMENSION || dimensions.height > MAX_DIMENSION) {
      this.hideProgress();
      store.showToast(`图片尺寸过大，建议不超过 ${MAX_DIMENSION}x${MAX_DIMENSION} 像素`);
      return;
    }

    // 判断是否需要压缩
    const needsCompression =
      file.size > COMPRESSION_CONFIG.maxFileSize ||
      img.width > COMPRESSION_CONFIG.maxWidth ||
      img.height > COMPRESSION_CONFIG.maxHeight;

    let finalFile = file;
    let finalBlob = null;

    if (needsCompression) {
      this.showProgress('正在压缩图片...');
      this.updateProgress(50);

      try {
        finalBlob = await this.smartCompress(img);
        finalFile = new File([finalBlob], file.name, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });

        const originalMB = (file.size / 1024 / 1024).toFixed(2);
        const compressedMB = (finalFile.size / 1024 / 1024).toFixed(2);
        const savings = Math.round((1 - finalFile.size / file.size) * 100);

        console.log(`Image compressed: ${originalMB}MB → ${compressedMB}MB (${savings}% reduction)`);
        store.showToast(`图片已压缩，节省 ${savings}% 大小`, 'success');
      } catch (err) {
        console.error('Compression error:', err);
        // 压缩失败则使用原图
        finalBlob = null;
      }
    }

    this.updateProgress(80);

    // 转换为 base64
    const reader = new FileReader();

    reader.onload = (e) => {
      const preview = e.target.result;

      this.state.file = finalFile;
      this.state.preview = preview;

      // 更新 UI
      this.updateProgress(100);
      setTimeout(() => {
        this.hideProgress();
        this.container.querySelector('.upload-placeholder').style.display = 'none';
        this.container.querySelector('.upload-preview').style.display = 'flex';
        this.container.querySelector('#previewImage').src = preview;

        // 更新状态
        store.setGenerateFile(finalFile, preview);
      }, 200);
    };

    reader.onerror = () => {
      this.hideProgress();
      store.showToast('图片处理失败，请重试');
    };

    reader.readAsDataURL(finalFile);
  }

  /**
   * 加载图片为 Image 对象
   */
  loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  /**
   * 显示进度条
   */
  showProgress(text = '处理中...') {
    const progressEl = this.container.querySelector('#uploadProgress');
    const progressText = this.container.querySelector('#progressText');

    progressEl.style.display = 'block';
    progressText.textContent = text;
    this.updateProgress(0);
  }

  /**
   * 更新进度
   */
  updateProgress(percent) {
    const progressFill = this.container.querySelector('#progressFill');
    const progressText = this.container.querySelector('#progressText');

    this.state.uploadProgress = percent;
    progressFill.style.width = `${percent}%`;
    progressText.textContent = `${percent}%`;
  }

  /**
   * 隐藏进度条
   */
  hideProgress() {
    const progressEl = this.container.querySelector('#uploadProgress');
    progressEl.style.display = 'none';
    this.state.uploadProgress = 0;
  }

  /**
   * 压缩图片
   * @param {HTMLImageElement} img - 图片元素
   * @param {number} maxSize - 最大尺寸（宽或高）
   * @param {number} quality - 压缩质量 (0-1)
   * @returns {Promise<Blob>} 压缩后的图片 Blob
   */
  async compressImage(img, maxSize, quality = COMPRESSION_CONFIG.quality) {
    return new Promise((resolve) => {
      // 计算缩放比例
      let width = img.width;
      let height = img.height;
      const maxDimension = Math.max(width, height);

      if (maxDimension > maxSize) {
        const scale = maxSize / maxDimension;
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      // 创建 canvas 进行压缩
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // 转换为 Blob
      canvas.toBlob(
        (blob) => {
          resolve(blob);
        },
        'image/jpeg',
        quality
      );
    });
  }

  /**
   * 智能压缩图片
   * 自动调整质量直到文件小于目标大小
   */
  async smartCompress(img, targetSize = COMPRESSION_CONFIG.maxFileSize) {
    let quality = COMPRESSION_CONFIG.quality;
    let blob = null;
    let iterations = 0;
    const maxIterations = 5;

    while (iterations < maxIterations) {
      blob = await this.compressImage(img, COMPRESSION_CONFIG.maxWidth, quality);

      if (blob.size <= targetSize || quality <= 0.5) {
        break;
      }

      quality -= 0.1;
      iterations++;
    }

    return blob;
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
