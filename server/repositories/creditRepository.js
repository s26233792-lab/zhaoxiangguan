/**
 * 用户积分数据访问层
 */
const { getPool } = require('../config/database');
const logger = require('../utils/logger');

class CreditRepository {
  /**
   * 根据设备ID查询积分
   * @param {string} deviceId - 设备ID
   */
  async findByDeviceId(deviceId) {
    const pool = getPool();
    const result = await pool.query(
      'SELECT credits FROM user_credits WHERE device_id = $1',
      [deviceId]
    );
    return result.rows[0]?.credits || 0;
  }

  /**
   * 创建或更新积分（UPSERT）
   * @param {string} deviceId - 设备ID
   * @param {number} amount - 积分变化量（正数为增加，负数为减少）
   * @param {Object} client - 可选的数据库客户端
   */
  async upsert(deviceId, amount, client = null) {
    const db = client || getPool();
    const result = await db.query(
      `INSERT INTO user_credits (device_id, credits) VALUES ($1, $2)
       ON CONFLICT (device_id) DO UPDATE
       SET credits = user_credits.credits + $2, updated_at = NOW()
       RETURNING credits`,
      [deviceId, amount]
    );
    return result.rows[0].credits;
  }

  /**
   * 原子扣减积分
   * @param {string} deviceId - 设备ID
   * @param {number} amount - 扣减数量
   * @param {Object} client - 可选的数据库客户端
   */
  async deduct(deviceId, amount = 1, client = null) {
    const db = client || getPool();
    const result = await db.query(
      `UPDATE user_credits
       SET credits = credits - $1, updated_at = NOW()
       WHERE device_id = $2 AND credits >= $1
       RETURNING credits`,
      [amount, deviceId]
    );

    if (result.rows.length === 0) {
      return null; // 积分不足
    }

    return result.rows[0].credits;
  }

  /**
   * 获取用户总数
   */
  async countUsers() {
    const pool = getPool();
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM user_credits'
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * 获取积分排行榜
   * @param {number} limit - 返回数量
   */
  async getTopUsers(limit = 10) {
    const pool = getPool();
    const result = await pool.query(
      `SELECT device_id, credits, created_at
       FROM user_credits
       ORDER BY credits DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }
}

module.exports = new CreditRepository();
