/**
 * 积分充值弹窗组件
 */
import { api } from '../services/api.js';
import { store } from '../app/state.js';

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
          <button class="modal-close" id="modalClose" type="button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <h2 class="modal-title">积分充值</h2>
          <p class="modal-desc">请输入卡密兑换积分</p>

          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">卡密</label>
              <input type="text" class="form-input" id="codeInput"
                     placeholder="请输入8位卡密" maxlength="20">
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

    const close = () => this.close();

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    closeBtn.addEventListener('click', close);
    cancelBtn.addEventListener('click', close);

    confirmBtn.addEventListener('click', async () => {
      const code = codeInput.value.trim().toUpperCase();

      if (!code) {
        store.showToast('请输入卡密', 'warning');
        return;
      }

      const deviceId = store.getState().user.deviceId;
      const resultEl = this.container.querySelector('#modalResult');

      try {
        store.setLoading(true);
        confirmBtn.disabled = true;
        confirmBtn.textContent = '兑换中...';

        const result = await api.redeemCode(code, deviceId);

        // 显示成功信息
        resultEl.style.display = 'block';
        resultEl.className = 'modal-result modal-result-success';
        resultEl.textContent = result.message || `兑换成功！获得 ${result.points} 点数，当前剩余 ${result.remaining} 点`;

        // 更新积分
        store.setCredits(result.remaining);
        store.showToast(result.message || '兑换成功！', 'success');

        // 延迟关闭
        setTimeout(() => {
          this.close();
          codeInput.value = '';
          resultEl.style.display = 'none';
        }, 1500);

      } catch (err) {
        resultEl.style.display = 'block';
        resultEl.className = 'modal-result modal-result-error';
        resultEl.textContent = err.message || '兑换失败，请检查卡密是否正确';
      } finally {
        store.setLoading(false);
        confirmBtn.disabled = false;
        confirmBtn.textContent = '兑换';
      }
    });
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
