/**
 * API 服务
 */
import { config } from '../app/config.js';

class APIService {
  /**
   * 通用请求方法
   */
  async request(url, options = {}) {
    const {
      method = 'GET',
      headers = {},
      body = null,
      timeout = config.requestTimeout,
    } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

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
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;

    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('请求超时');
      }
      throw err;
    }
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
  async generateImage(imageBase64, prompt, deviceId, options = {}) {
    return this.post(config.endpoints.generate, {
      image: imageBase64,
      prompt,
      deviceId,
      options,
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
