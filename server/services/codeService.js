/**
 * 卡密业务逻辑层
 */
const codeRepository = require('../repositories/codeRepository');
const creditRepository = require('../repositories/creditRepository');
const usageRepository = require('../repositories/usageRepository');
const { generateSecureCode } = require('../utils/crypto');
const { DEFAULTS, VALIDATION, CODE_STATUS } = require('../config/constants');
const logger = require('../utils/logger');
const { NotFoundError, ConflictError } = require('../middleware/errorHandler');

class CodeService {
  /**
   * 兑换卡密（原子事务）
   * @param {string} code - 卡密
   * @param {string} deviceId - 设备ID
   * @returns {Promise<Object>} 兑换结果
   */
  async redeemCode(code, deviceId) {
    const { getPool } = require('../config/database');
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. 查询并锁定卡密记录
      const codeRecord = await codeRepository.findByCodeWithLock(code, client);

      if (!codeRecord) {
        await client.query('ROLLBACK');
        throw new NotFoundError('验证码不存在或已使用');
      }

      const points = codeRecord.points;

      // 2. 更新卡密状态
      await codeRepository.markAsUsed(code, client);

      // 3. 记录使用日志
      await usageRepository.logRedeemCode(deviceId, code);

      // 4. 更新用户积分
      const remainingCredits = await creditRepository.upsert(deviceId, points, client);

      await client.query('COMMIT');

      logger.info('Code redeemed successfully', {
        code,
        deviceId,
        points,
        remaining: remainingCredits,
      });

      return {
        success: true,
        points,
        remaining: remainingCredits,
        message: `验证成功，+${points} 点数`,
      };

    } catch (err) {
      await client.query('ROLLBACK');
      logger.error('Code redemption failed', { code, deviceId, error: err.message });
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * 生成卡密
   * @param {Object} options - 生成选项
   * @returns {Promise<Array>} 生成的卡密列表
   */
  async generateCodes(options = {}) {
    const {
      points = DEFAULTS.POINTS,
      amount = DEFAULTS.GENERATE_AMOUNT,
      codeLength = DEFAULTS.CODE_LENGTH,
    } = options;

    const generatedCodes = [];

    for (let i = 0; i < amount; i++) {
      let code;
      let exists = true;
      let attempts = 0;
      const maxAttempts = VALIDATION.CODE_UNIQUE_ATTEMPTS;

      // 生成唯一码，避免重复
      while (exists && attempts < maxAttempts) {
        code = generateSecureCode(codeLength);

        const existing = await codeRepository.findByCode(code);
        exists = !!existing;
        attempts++;
      }

      if (attempts >= maxAttempts) {
        logger.error('Unable to generate unique code after max attempts');
        continue;
      }

      // 插入数据库
      await codeRepository.create(code, points);
      generatedCodes.push({ code, points, status: CODE_STATUS.ACTIVE });
    }

    logger.info('Codes generated', {
      count: generatedCodes.length,
      points,
      codeLength,
    });

    return generatedCodes;
  }

  /**
   * 查询卡密列表
   * @param {Object} options - 查询选项
   */
  async getCodes(options = {}) {
    const { status = 'all', limit = DEFAULTS.LIST_LIMIT, offset = 0 } = options;

    // 验证状态参数
    if (status !== 'all' && status !== CODE_STATUS.ACTIVE && status !== CODE_STATUS.USED) {
      throw new Error('Invalid status parameter');
    }

    const limitNum = Math.min(Math.max(1, parseInt(limit) || DEFAULTS.LIST_LIMIT), DEFAULTS.LIST_MAX_LIMIT);
    const offsetNum = Math.max(0, parseInt(offset) || 0);

    return codeRepository.findList({
      status,
      limit: limitNum,
      offset: offsetNum,
    });
  }

  /**
   * 查询卡密状态
   * @param {string} code - 卡密
   */
  async getCodeStatus(code) {
    const codeRecord = await codeRepository.findByCode(code);

    if (!codeRecord) {
      return { exists: false };
    }

    return {
      exists: true,
      status: codeRecord.status,
      points: codeRecord.points,
    };
  }

  /**
   * 删除卡密
   * @param {string} code - 卡密
   */
  async deleteCode(code) {
    const deleted = await codeRepository.delete(code);

    if (!deleted) {
      throw new NotFoundError('卡密不存在');
    }

    logger.info('Code deleted', { code });

    return { success: true };
  }

  /**
   * 获取卡密统计
   */
  async getStats() {
    return codeRepository.getStats();
  }
}

module.exports = new CodeService();
