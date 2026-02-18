/**
 * 积分充值弹窗组件
 */
import { api } from '../services/api.js';
import { store } from '../app/state.js';

// 错误消息映射
const ERROR_MESSAGES = {
  '卡密不存在': {
    message: '卡密不��在',
    suggestion: '请检查卡密是否正确输入，或联系客服获取有效卡密'
  },
  '卡密已使用': {
    message: '该卡密已被使用',
    suggestion: '每个卡密只能使用一次，请使用其他卡密'
  },
  '卡密已过期': {
    message: '卡密已过期',
    suggestion: '该卡密已超过有效期，请联系客服获取新的卡密'
  },
  '卡密无效': {
    message: '卡密格式无效',
    suggestion: '请检查卡密格式，通常为8位字母数字组合'
  },
};

export class CreditModal {
  constructor(container) {
    this.container = container;
    this.isOpen = false;
    this.render();
    this.bindEvents();
  }

  render() {
    this.container.innerHTML = `
      <div class="modal-overlay" id="modalOverlay" style="display: none;">
        <div class="modal" id="modalContent">
          <button class="modal-close" id="modalClose" type="button" aria-label="关闭弹窗">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <h2 class="modal-title">积分充值</h2>
          <p class="modal-desc">请输入卡密兑换积分</p>

          <div class="modal-body">
            <div class="form-group">
              <label class="form-label" for="codeInput">卡密</label>
              <input type="text" class="form-input" id="codeInput"
                     placeholder="请输入卡密" maxlength="20"
                     autocomplete="off" spellcheck="false">
              <div class="form-hint" id="formHint">卡密将自动转换为大写</div>
            </div>

            <div class="modal-result" id="modalResult" style="display: none;"></div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" id="modalCancel" type="button">取消</button>
            <button class="btn btn-primary" id="modalConfirm" type="button">兑换</button>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    const overlay = this.container.querySelector('#modalOverlay');
    const closeBtn = this.container.querySelector('#modalClose');
    const cancelBtn = this.container.querySelector('#modalCancel');
    const confirmBtn = this.container.querySelector('#modalConfirm');
    const codeInput = this.container.querySelector('#codeInput');
    const formHint = this.container.querySelector('#formHint');

    const close = () => this.close();

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    closeBtn.addEventListener('click', close);
    cancelBtn.addEventListener('click', close);

    // 实时格式验证
    codeInput.addEventListener('input', (e) => {
      // 自动转换为大写
      const value = e.target.value.toUpperCase();
      e.target.value = value;

      // 更新字符计数提示
      const count = value.length;
      if (count === 0) {
        formHint.textContent = '卡密将自动转换为大写';
        formHint.className = 'form-hint';
      } else if (count < 8) {
        formHint.textContent = `已输入 ${count} 位，建议卡密为 8 位`;
        formHint.className = 'form-hint form-hint-warning';
      } else {
        formHint.textContent = `已输入 ${count} 位`;
        formHint.className = 'form-hint form-hint-success';
      }

      // 清除之前的错误显示
      const resultEl = this.container.querySelector('#modalResult');
      if (resultEl.style.display !== 'none') {
        resultEl.style.display = 'none';
      }
    });

    // 支持 Enter 键提交
    codeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !confirmBtn.disabled) {
        confirmBtn.click();
      }
    });

    confirmBtn.addEventListener('click', async () => {
      const code = codeInput.value.trim().toUpperCase();

      if (!code) {
        this.showError('请输入卡密', '卡密不能为空，请输入有效的卡密');
        codeInput.focus();
        return;
      }

      if (code.length < 4) {
        this.showError('卡密格式可能不正确', '卡密长度太短，请检查是否输入完整');
        codeInput.focus();
        return;
      }

      const deviceId = store.getState().user.deviceId;
      const resultEl = this.container.querySelector('#modalResult');

      try {
        store.setLoading(true);
        confirmBtn.disabled = true;
        confirmBtn.textContent = '兑换中...';
        resultEl.style.display = 'none';

        const result = await api.redeemCode(code, deviceId);

        // 显示成功信息
        this.showSuccess(result.message || `兑换成功！获得 ${result.points} 点数`);

        // 更新积分
        store.setCredits(result.remaining);
        store.showToast(result.message || '兑换成功！', 'success');

        // 延迟关闭
        setTimeout(() => {
          this.close();
          codeInput.value = '';
          formHint.textContent = '卡密将自动转换为大写';
          formHint.className = 'form-hint';
          resultEl.style.display = 'none';
        }, 1500);

      } catch (err) {
        const errorInfo = this.getErrorInfo(err.message);
        this.showError(errorInfo.message, errorInfo.suggestion);
      } finally {
        store.setLoading(false);
        confirmBtn.disabled = false;
        confirmBtn.textContent = '兑换';
      }
    });
  }

  /**
   * 获取详细的错误信息
   */
  getErrorInfo(errorMessage) {
    // 精确匹配
    if (ERROR_MESSAGES[errorMessage]) {
      return ERROR_MESSAGES[errorMessage];
    }

    // 模糊匹配
    for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
      if (errorMessage.includes(key)) {
        return value;
      }
    }

    // 默认错误信息
    return {
      message: errorMessage || '兑换失败',
      suggestion: '请检查卡密是否正确，或稍后重试'
    };
  }

  /**
   * 显示错误信息
   */
  showError(message, suggestion = '') {
    const resultEl = this.container.querySelector('#modalResult');
    resultEl.style.display = 'block';
    resultEl.className = 'modal-result modal-result-error';
    resultEl.innerHTML = `
      <div class="modal-result-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <div class="modal-result-content">
        <div class="modal-result-message">${message}</div>
        ${suggestion ? `<div class="modal-result-suggestion">${suggestion}</div>` : ''}
      </div>
    `;
  }

  /**
   * 显示成功信息
   */
  showSuccess(message) {
    const resultEl = this.container.querySelector('#modalResult');
    resultEl.style.display = 'block';
    resultEl.className = 'modal-result modal-result-success';
    resultEl.innerHTML = `
      <div class="modal-result-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      </div>
      <div class="modal-result-content">
        <div class="modal-result-message">${message}</div>
      </div>
    `;
  }

  open() {
    this.isOpen = true;
    this.container.querySelector('#modalOverlay').style.display = 'flex';
    this.container.querySelector('#codeInput').focus();
  }

  close() {
    this.isOpen = false;
    this.container.querySelector('#modalOverlay').style.display = 'none';
  }
}
