/**
 * Toast 消息提示组��
 */
export class Toast {
  constructor(container) {
    this.container = container;
    this.element = null;
  }

  show(message, type = 'info') {
    this.element = document.createElement('div');
    this.element.className = `toast toast-${type}`;
    this.element.textContent = message;

    this.container.appendChild(this.element);

    // 触发动画
    requestAnimationFrame(() => {
      this.element.classList.add('toast-show');
    });

    // 自动隐藏
    setTimeout(() => {
      this.hide();
    }, 3000);
  }

  hide() {
    if (this.element) {
      this.element.classList.remove('toast-show');
      this.element.classList.add('toast-hide');
      setTimeout(() => {
        if (this.element && this.element.parentNode) {
          this.element.parentNode.removeChild(this.element);
        }
        this.element = null;
      }, 300);
    }
  }

  success(message) {
    this.show(message, 'success');
  }

  error(message) {
    this.show(message, 'error');
  }

  info(message) {
    this.show(message, 'info');
  }

  warning(message) {
    this.show(message, 'warning');
  }
}
