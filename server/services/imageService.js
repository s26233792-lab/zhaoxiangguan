/**
 * 图片生成业务逻辑层
 */
const axios = require('axios');
const config = require('../config/env');
const creditService = require('./creditService');
const usageRepository = require('../repositories/usageRepository');
const logger = require('../utils/logger');
const { APIError, NotFoundError } = require('../middleware/errorHandler');

class ImageService {
  /**
   * 生成图片
   * @param {string} imageBase64 - Base64编码的图片
   * @param {string} prompt - 风格提示词
   * @param {string} deviceId - 设备ID
   * @returns {Promise<Buffer>} 生成的图片数据
   */
  async generateImage(imageBase64, prompt, deviceId = null) {
    const { getPool } = require('../config/database');
    const pool = getPool();

    // 如果提供了设备ID，需要在事务中扣除积分
    let client = null;
    if (deviceId && pool) {
      client = await pool.connect();
    }

    try {
      // 开始事务扣除积分
      if (deviceId && client) {
        await client.query('BEGIN');

        // 检查并扣除积分
        const remaining = await creditService.deduct(deviceId, 1);

        if (remaining === null) {
          await client.query('ROLLBACK');
          throw new NotFoundError('积分不足，请先充值');
        }
      }

      // 调用外部API生成图片
      const imageData = await this.callImageAPI(imageBase64, prompt);

      // 提交事务
      if (deviceId && client) {
        // 记录使用日志
        await usageRepository.logGenerateImage(deviceId, { prompt });

        await client.query('COMMIT');

        logger.info('Image generated successfully', {
          deviceId,
          imageSize: imageData.length,
        });
      }

      return imageData;

    } catch (err) {
      // 回滚事务
      if (deviceId && client) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackErr) {
          logger.error('Rollback error', rollbackErr);
        }
      }

      // API错误特殊处理
      if (err.response) {
        const status = err.response.status;
        const message = this.getAPIErrorMessage(status);

        logger.error('External API error', {
          status,
          message: err.response.data?.toString || err.message,
        });

        throw new APIError(message);
      }

      // 网络错误
      if (err.code === 'ECONNABORTED') {
        throw new APIError('API请求超时，请稍后重试');
      }

      if (err.code === 'ECONNREFUSED') {
        throw new APIError('图片生成服务暂时不可用');
      }

      throw err;

    } finally {
      if (client) client.release();
    }
  }

  /**
   * 调用外部图片生成API
   * @param {string} imageBase64 - Base64图片
   * @param {string} prompt - 提示词
   * @returns {Promise<Buffer>} 图片数据
   */
  async callImageAPI(imageBase64, prompt) {
    if (!config.API_ENDPOINT || !config.API_KEY) {
      throw new APIError('API配置错误');
    }

    const response = await axios.post(
      config.API_ENDPOINT,
      { image: imageBase64, prompt },
      {
        headers: {
          'Authorization': `Bearer ${config.API_KEY}`,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
        timeout: config.API_TIMEOUT,
      }
    );

    return response.data;
  }

  /**
   * 根据HTTP状态码获取错误消息
   * @param {number} status - HTTP状态码
   */
  getAPIErrorMessage(status) {
    const messages = {
      400: 'API请求参数错误',
      401: 'API密钥无效',
      403: 'API访问被拒绝',
      404: 'API接口不存在',
      429: 'API请求次数超限，请稍后重试',
      500: '图片生成服务内部错误',
      502: '图片生成服务网关错误',
      503: '图片生成服务暂时不可用',
      504: '图片生成服务请求超时',
    };

    return messages[status] || '图片生成失败，请稍后重试';
  }

  /**
   * 处理风格选项，生成完整提示词
   * @param {Object} options - 风格选项
   * @returns {string} 完整提示词
   */
  buildPrompt(options = {}) {
    const {
      angle = 'front',
      skinTone = 'natural',
      outfit = 'business_formal',
      background = 'white',
      customPrompt = '',
    } = options;

    const promptParts = [];

    // 基础描述
    promptParts.push('professional American-style portrait photo');

    // 拍摄角度
    switch (angle) {
      case 'side':
        promptParts.push('slight side angle');
        break;
      default:
        promptParts.push('front-facing direct eye contact');
    }

    // 肤色处理
    switch (skinTone) {
      case 'brighten':
        promptParts.push('slightly brightened skin tone');
        break;
      default:
        promptParts.push('natural skin tone');
    }

    // 服装
    switch (outfit) {
      case 'business_casual':
        promptParts.push('wearing business casual attire');
        break;
      case 'academic':
        promptParts.push('wearing academic doctoral regalia');
        break;
      case 'original':
        promptParts.push('keeping original clothing');
        break;
      default:
        promptParts.push('wearing professional business suit');
    }

    // 背景
    switch (background) {
      case 'gray':
        promptParts.push('neutral gray background');
        break;
      case 'blue':
        promptParts.push('professional blue gradient background');
        break;
      case 'original':
        promptParts.push('original background');
        break;
      default:
        promptParts.push('clean white background');
    }

    // 质量描述
    promptParts.push('high quality studio lighting, sharp focus, professional photography');

    // 添加自定义提示词
    if (customPrompt) {
      promptParts.push(customPrompt);
    }

    return promptParts.join(', ');
  }
}

module.exports = new ImageService();
