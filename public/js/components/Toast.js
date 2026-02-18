/**
 * Toast 消息提示组件
 *
 * 特性：
 * - 防止消息堆叠（同一时间只显示一个 Toast）
 * - 支持排队机制（新消息会替换当前消息）
 * - 自动隐藏和清理
 */
export class Toast {
  constructor(container) {
    this.container = container;
    this.currentElement = null;
    this.hideTimeout = null;
    this.removeTimeout = null;
  }

  /**
   * 显示 Toast 消息
   * 如果已有消息在显示，会先隐藏再显示新消息
   */
  show(message, type = 'info', duration = 3000) {
    // 清除现有的定时器
    this._clearTimeouts();

    // 如果已有 Toast 在显示，先移除
    if (this.currentElement && this.currentElement.parentNode) {
      this._removeElementImmediate();
    }

    // 创建新 Toast
    this.currentElement = document.createElement('div');
    this.currentElement.className = `toast toast-${type}`;
    this.currentElement.textContent = message;

    // 添加到容器
    this.container.appendChild(this.currentElement);

    // 触发进入动画
    requestAnimationFrame(() => {
      this.currentElement.classList.add('toast-show');
    });

    // 设置自动隐藏
    this.hideTimeout = setTimeout(() => {
      this.hide();
    }, duration);
  }

  /**
   * 隐藏当前 Toast
   */
  hide() {
    this._clearTimeouts();

    if (this.currentElement) {
      this.currentElement.classList.remove('toast-show');
      this.currentElement.classList.add('toast-hide');

      // 等待退出动画完成后移除元素
      this.removeTimeout = setTimeout(() => {
        this._removeElementImmediate();
      }, 300);
    }
  }

  /**
   * 立即移除当前 Toast 元素（无动画）
   */
  _removeElementImmediate() {
    if (this.currentElement && this.currentElement.parentNode) {
      this.currentElement.parentNode.removeChild(this.currentElement);
    }
    this.currentElement = null;
  }

  /**
   * 清除所有定时器
   */
  _clearTimeouts() {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
    if (this.removeTimeout) {
      clearTimeout(this.removeTimeout);
      this.removeTimeout = null;
    }
  }

  /**
   * 清理资源（在组件销毁时调用）
   */
  destroy() {
    this._clearTimeouts();
    this._removeElementImmediate();
  }

  // ==================== 便捷方法 ====================

  success(message, duration) {
    this.show(message, 'success', duration);
  }

  error(message, duration) {
    this.show(message, 'error', duration);
  }

  info(message, duration) {
    this.show(message, 'info', duration);
  }

  warning(message, duration) {
    this.show(message, 'warning', duration);
  }
}
