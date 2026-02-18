/**
 * API 服务
 */
import { config } from '../app/config.js';

// 可重试的 HTTP 状态码
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

class APIService {
  /**
   * 延迟函数
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 通用请求方法（支持重试和取消）
   */
  async request(url, options = {}) {
    const {
      method = 'GET',
      headers = {},
      body = null,
      timeout = config.requestTimeout,
      retries = 2,           // 重试次数
      retryDelay = 1000,     // 重试延迟（毫秒）
      signal = null,         // AbortSignal 用于取消请求
    } = options;

    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // 如果提供了外部 signal，当外部 signal 被 abort 时，也 abort 当前的请求
      if (signal) {
        signal.addEventListener('abort', () => {
          controller.abort();
        });
      }

      try {
        const requestOptions = {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
        };

        if (body) {
          requestOptions.body = JSON.stringify(body);
        }

        const response = await fetch(url, {
          ...requestOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // 处理非 JSON 响应（如图片）
        if (!response.headers.get('content-type')?.includes('application/json')) {
          if (!response.ok) {
            // 检查是否可重试
            if (this._shouldRetry(response.status, attempt, retries)) {
              await this._delay(retryDelay * (attempt + 1));
              continue;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          return response;
        }

        const data = await response.json();

        if (!response.ok) {
          // 检查是否可重试
          if (this._shouldRetry(response.status, attempt, retries)) {
            await this._delay(retryDelay * (attempt + 1));
            continue;
          }
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        return data;

      } catch (err) {
        clearTimeout(timeoutId);
        lastError = err;

        // 网络错误重试
        if (attempt < retries && this._isNetworkError(err)) {
          console.log(`请求失败，正在重试 (${attempt + 1}/${retries})...`, err.message);
          await this._delay(retryDelay * (attempt + 1));
          continue;
        }

        // 超时不重试（已由 AbortController 处理）
        if (err.name === 'AbortError') {
          throw new Error('请求超时');
        }

        // 最后一次尝试或不可重试的错误
        if (attempt === retries) {
          throw err;
        }
      }
    }

    throw lastError || new Error('请求失败');
  }

  /**
   * 判断是否应该重试
   */
  _shouldRetry(status, attempt, maxRetries) {
    return attempt < maxRetries && RETRYABLE_STATUS_CODES.includes(status);
  }

  /**
   * 判断是否为网络错误
   */
  _isNetworkError(err) {
    return err instanceof TypeError &&
           (err.message.includes('fetch') ||
            err.message.includes('network') ||
            err.message.includes('Failed to fetch'));
  }

  /**
   * GET 请求
   */
  async get(endpoint, params = {}) {
    const url = new URL(endpoint, window.location.origin);
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined) {
        url.searchParams.append(key, params[key]);
      }
    });
    return this.request(url.toString());
  }

  /**
   * POST 请求
   */
  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: data,
    });
  }

  /**
   * DELETE 请求
   */
  async delete(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'DELETE',
      body: data,
    });
  }

  // ==================== API 方法 ====================

  /**
   * 查询用户积分
   */
  async getCredits(deviceId) {
    return this.get(config.endpoints.credits, { deviceId });
  }

  /**
   * 验证卡密状态
   */
  async checkCode(code) {
    return this.get(config.endpoints.verifyCode, { code });
  }

  /**
   * 兑换卡密
   */
  async redeemCode(code, deviceId) {
    return this.post(config.endpoints.verifyCode, {
      code,
      deviceId,
    });
  }

  /**
   * 生成图片
   */
  async generateImage(imageBase64, prompt, deviceId, options = {}, requestOptions = {}) {
    const { signal } = requestOptions;

    return this.request(config.endpoints.generate, {
      image: imageBase64,
      prompt,
      deviceId,
      options,
      signal,
    });
  }

  // ==================== 管理员 API ====================

  /**
   * 获取统计数据
   */
  async getStats(adminPassword) {
    return this.get(config.endpoints.stats, { adminPassword });
  }

  /**
   * 获取卡密列表
   */
  async getCodes(adminPassword, options = {}) {
    const params = { adminPassword, ...options };
    return this.get(config.endpoints.codes, params);
  }

  /**
   * 生成卡密
   */
  async generateCodes(adminPassword, options = {}) {
    return this.post(config.endpoints.codes, {
      adminPassword,
      ...options,
    });
  }

  /**
   * 删除卡密
   */
  async deleteCode(adminPassword, code) {
    return this.delete(config.endpoints.codes, {
      adminPassword,
      code,
    });
  }
}

// 导出单例
export const api = new APIService();
