/**
 * 积分业务逻辑层
 */
const creditRepository = require('../repositories/creditRepository');
const logger = require('../utils/logger');
const { NotFoundError } = require('../middleware/errorHandler');

class CreditService {
  /**
   * 获取用户积分
   * @param {string} deviceId - 设备ID
   * @returns {Promise<number>} 积分余额
   */
  async getCredits(deviceId) {
    if (!deviceId) {
      return 0;
    }

    const credits = await creditRepository.findByDeviceId(deviceId);

    logger.debug('Credits retrieved', { deviceId, credits });

    return credits;
  }

  /**
   * 充值积分
   * @param {string} deviceId - 设备ID
   * @param {number} amount - 充值数量
   * @returns {Promise<Object>} 充值结果
   */
  async recharge(deviceId, amount) {
    const remaining = await creditRepository.upsert(deviceId, amount);

    logger.info('Credits recharged', {
      deviceId,
      amount,
      remaining,
    });

    return {
      success: true,
      remaining,
      charged: amount,
    };
  }

  /**
   * 扣减积分（原子操作）
   * @param {string} deviceId - 设备ID
   * @param {number} amount - 扣减数量
   * @returns {Promise<number>} 剩余积分
   */
  async deduct(deviceId, amount = 1) {
    const remaining = await creditRepository.deduct(deviceId, amount);

    if (remaining === null) {
      logger.warn('Insufficient credits', { deviceId, amount });
      throw new NotFoundError('积分不足，请先充值');
    }

    logger.info('Credits deducted', {
      deviceId,
      amount,
      remaining,
    });

    return remaining;
  }

  /**
   * 检查积分是否足够
   * @param {string} deviceId - 设备ID
   * @param {number} amount - 需要的数量
   * @returns {Promise<boolean>}
   */
  async hasEnoughCredits(deviceId, amount = 1) {
    const credits = await this.getCredits(deviceId);
    return credits >= amount;
  }

  /**
   * 获取用户总数
   */
  async getUserCount() {
    return creditRepository.countUsers();
  }

  /**
   * 获取积分排行榜
   * @param {number} limit - 返回数量
   */
  async getTopUsers(limit = 10) {
    return creditRepository.getTopUsers(limit);
  }
}

module.exports = new CreditService();
