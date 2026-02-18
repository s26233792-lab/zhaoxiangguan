/**
 * 状态管理 - Store 模式
 */
import { config } from './config.js';

class Store {
  constructor() {
    this.state = {
      // 用户状态
      user: {
        deviceId: this.getDeviceId(),
        credits: 0,
        creditsLoaded: false,
      },

      // UI 状态
      ui: {
        loading: false,
        toast: null,
        modal: null,
      },

      // 图片生成状态
      generate: {
        file: null,
        preview: null,
        result: null,
        options: {
          aspectRatio: '1:1',
          angle: 'front',
          skinTone: 'natural',
          outfit: 'business_formal',
          background: 'white',
        },
      },
    };

    this.listeners = new Set();
  }

  /**
   * 获取或生成设备ID
   */
  getDeviceId() {
    let deviceId = localStorage.getItem(config.deviceIdKey);
    if (!deviceId) {
      deviceId = this.generateDeviceId();
      localStorage.setItem(config.deviceIdKey, deviceId);
    }
    return deviceId;
  }

  /**
   * 生成新的设备ID
   */
  generateDeviceId() {
    return 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 获取当前状态
   */
  getState() {
    return { ...this.state };
  }

  /**
   * 更新状态
   */
  setState(updates) {
    const oldState = this.state;
    this.state = this.deepMerge(oldState, updates);
    this.notify(oldState);
  }

  /**
   * 深度合并对象
   */
  deepMerge(target, source) {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * 订阅状态变化
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 通知所有监听器
   */
  notify(oldState) {
    for (const listener of this.listeners) {
      try {
        listener(this.state, oldState);
      } catch (err) {
        console.error('State listener error:', err);
      }
    }
  }

  // ==================== 快捷方法 ====================

  setLoading(loading) {
    this.setState({ ui: { loading } });
  }

  showToast(message, type = 'info') {
    // 兼容旧的对象格式（如果有直接调用 setState 的情况）
    const toast = typeof message === 'object' && message.message
      ? message
      : { message: String(message), type };
    this.setState({ ui: { toast } });
    setTimeout(() => {
      this.setState({ ui: { toast: null } });
    }, 3000);
  }

  setCredits(credits) {
    this.setState({
      user: {
        credits,
        creditsLoaded: true,
      },
    });
  }

  setGenerateFile(file, preview) {
    this.setState({
      generate: {
        file,
        preview,
        result: null,
      },
    });
  }

  setGenerateResult(result) {
    this.setState({
      generate: {
        result,
      },
    });
  }

  setGenerateOption(key, value) {
    this.setState({
      generate: {
        options: {
          [key]: value,
        },
      },
    });
  }
}

// 导出单例
export const store = new Store();
