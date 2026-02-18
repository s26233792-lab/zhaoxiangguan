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
        const remaining = await creditService.deduct(deviceId, 1, client);

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
        await usageRepository.logGenerateImage(deviceId, { prompt }, client);

        await client.query('COMMIT');
        logger.info('Transaction committed - credits deducted', { deviceId });

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
          logger.info('Transaction rolled back - credits restored', { deviceId, reason: err.message });
        } catch (rollbackErr) {
          logger.error('Rollback error', { rollbackError: rollbackErr.message, originalError: err.message });
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
      logger.error('API configuration missing', {
        hasEndpoint: !!config.API_ENDPOINT,
        hasKey: !!config.API_KEY,
      });
      throw new APIError('API配置错误，请联系管理员');
    }

    // 提取base64数据（去掉data:image/xxx;base64,前缀）
    const base64Data = imageBase64.includes('base64,')
      ? imageBase64.split('base64,')[1]
      : imageBase64;

    // 检测图片类型
    const mimeTypes = {
      'data:image/jpeg': 'image/jpeg',
      'data:image/jpg': 'image/jpeg',
      'data:image/png': 'image/png',
      'data:image/webp': 'image/webp',
    };

    let mimeType = 'image/jpeg';
    for (const [dataUri, mime] of Object.entries(mimeTypes)) {
      if (imageBase64.startsWith(dataUri)) {
        mimeType = mime;
        break;
      }
    }

    // 构建Gemini格式请求
    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data
              }
            }
          ]
        }
      ]
    };

    // 12API使用Gemini端点（URL参数认证）
    const model = config.NANOBANANA_MODEL || 'gemini-3-pro-image-preview';
    const endpoint = `${config.API_ENDPOINT}/v1beta/models/${model}:generateContent?key=${config.API_KEY}`;

    logger.info('Calling 12API NanoBanana', {
      endpoint,
      model,
      promptLength: prompt?.length,
      imageSize: base64Data?.length,
    });

    try {
      const response = await axios.post(
        endpoint,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
          timeout: config.API_TIMEOUT || 120000, // 图片生成可能需要更长时间
        }
      );

      // Gemini API返回JSON，需要解析图片数据
      // 响应格式: { candidates: [{ content: { parts: [{ inline_data: { data: base64 } }] } }] }
      const responseText = Buffer.from(response.data).toString('utf-8');

      // 添加详细日志查看完整响应
      logger.info('12API raw response', {
        responseText: responseText.substring(0, 2000), // 记录前2000字符
        responseLength: responseText.length,
      });

      const jsonResponse = JSON.parse(responseText);

      logger.info('12API parsed response', {
        responseType: typeof jsonResponse,
        keys: Object.keys(jsonResponse),
        candidates: jsonResponse.candidates?.length,
        hasCandidates: !!jsonResponse.candidates,
        firstCandidateKeys: jsonResponse.candidates?.[0] ? Object.keys(jsonResponse.candidates[0]) : [],
      });

      // 提取图片数据 - 支持多种响应格式
      let imageBuffer = null;
      let extractionMethod = '';

      // 格式1: 标准 Gemini 格式 candidates[0].content.parts[].inline_data.data
      if (jsonResponse.candidates?.[0]?.content?.parts) {
        for (const part of jsonResponse.candidates[0].content.parts) {
          if (part.inline_data?.data) {
            imageBuffer = Buffer.from(part.inline_data.data, 'base64');
            extractionMethod = 'gemini-standard';
            break;
          }
        }
      }

      // 格式2: 直接在 data 字段（base64字符串）
      if (!imageBuffer && jsonResponse.data) {
        try {
          imageBuffer = Buffer.from(jsonResponse.data, 'base64');
          extractionMethod = 'direct-data';
        } catch (e) {
          logger.warn('Failed to parse data field as base64', { error: e.message });
        }
      }

      // 格式3: 在 image 字段（base64字符串）
      if (!imageBuffer && jsonResponse.image) {
        try {
          imageBuffer = Buffer.from(jsonResponse.image, 'base64');
          extractionMethod = 'image-field';
        } catch (e) {
          logger.warn('Failed to parse image field as base64', { error: e.message });
        }
      }

      // 格式4: 在 result.image 字段
      if (!imageBuffer && jsonResponse.result?.image) {
        try {
          imageBuffer = Buffer.from(jsonResponse.result.image, 'base64');
          extractionMethod = 'result-image';
        } catch (e) {
          logger.warn('Failed to parse result.image field as base64', { error: e.message });
        }
      }

      // 格式5: 在 output.data 字段
      if (!imageBuffer && jsonResponse.output?.data) {
        try {
          imageBuffer = Buffer.from(jsonResponse.output.data, 'base64');
          extractionMethod = 'output-data';
        } catch (e) {
          logger.warn('Failed to parse output.data field as base64', { error: e.message });
        }
      }

      // 如果找到图片，返回
      if (imageBuffer && imageBuffer.length > 0) {
        logger.info('Image extracted successfully', {
          bufferSize: imageBuffer.length,
          method: extractionMethod,
        });
        return imageBuffer;
      }

      // 如果没找到图片，记录更详细的信息用于调试
      logger.error('No image found in any expected format', {
        responseKeys: Object.keys(jsonResponse),
        hasCandidates: !!jsonResponse.candidates,
        hasData: !!jsonResponse.data,
        hasImage: !!jsonResponse.image,
        hasResult: !!jsonResponse.result,
        hasOutput: !!jsonResponse.output,
        fullResponse: JSON.stringify(jsonResponse).substring(0, 2000),
      });
      throw new APIError('API返回数据中没有找到图片，响应格式可能已变更');

    } catch (error) {
      // 详细记录axios错误
      if (error.response) {
        const responseData = error.response.data
          ? Buffer.from(error.response.data).toString('utf-8')
          : 'no data';

        logger.error('12API error response', {
          status: error.response.status,
          statusText: error.response.statusText,
          response: responseData.substring(0, 1000),
        });
      } else if (error.request) {
        logger.error('12API request failed', {
          code: error.code,
          message: error.message,
        });
      } else {
        logger.error('12API setup error', {
          message: error.message,
          stack: error.stack,
        });
      }
      throw error;
    }
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
