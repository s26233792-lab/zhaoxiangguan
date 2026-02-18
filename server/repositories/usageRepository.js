/**
 * 使用日志数据访问层
 */
const { getPool } = require('../config/database');
const { LOG_ACTIONS } = require('../config/constants');

class UsageRepository {
  /**
   * 记录日志
   * @param {string} deviceId - 设备ID
   * @param {string} action - 操作类型
   * @param {Object} metadata - 额外信息（JSONB）
   */
  async log(deviceId, action, metadata = null) {
    const pool = getPool();
    await pool.query(
      `INSERT INTO usage_logs (device_id, action, metadata)
       VALUES ($1, $2, $3)`,
      [deviceId, action, metadata]
    );
  }

  /**
   * 记录卡密兑换
   * @param {string} deviceId - 设备ID
   * @param {string} code - 卡密
   */
  async logRedeemCode(deviceId, code) {
    return this.log(deviceId, `${LOG_ACTIONS.REDEEM_CODE}:${code}`, { code });
  }

  /**
   * 记录图片生成
   * @param {string} deviceId - 设备ID
   * @param {Object} metadata - 元数据
   */
  async logGenerateImage(deviceId, metadata = {}) {
    return this.log(deviceId, LOG_ACTIONS.GENERATE_IMAGE, metadata);
  }

  /**
   * 记录管理操作
   * @param {string} deviceId - 管理员设备ID
   * @param {string} action - 操作类型
   * @param {Object} metadata - 详细信息
   */
  async logAdminAction(deviceId, action, metadata = {}) {
    return this.log(deviceId, action, metadata);
  }

  /**
   * 获取用户操作历史
   * @param {string} deviceId - 设备ID
   * @param {number} limit - 返回数量
   */
  async getUserHistory(deviceId, limit = 50) {
    const pool = getPool();
    const result = await pool.query(
      `SELECT * FROM usage_logs
       WHERE device_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [deviceId, limit]
    );
    return result.rows;
  }

  /**
   * 获取最近的操作日志
   * @param {number} limit - 返回数量
   */
  async getRecentLogs(limit = 100) {
    const pool = getPool();
    const result = await pool.query(
      `SELECT * FROM usage_logs
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  /**
   * 统计特定操作的次数
   * @param {string} action - 操作类型
   */
  async countByAction(action) {
    const pool = getPool();
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM usage_logs WHERE action LIKE $1`,
      [`${action}%`]
    );
    return parseInt(result.rows[0].count);
  }
}

module.exports = new UsageRepository();
