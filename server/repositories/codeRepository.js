/**
 * 验证码数据访问层
 */
const { getPool } = require('../config/database');
const { CODE_STATUS } = require('../config/constants');
const logger = require('../utils/logger');

class CodeRepository {
  /**
   * 根据卡密查询（带锁定）
   * @param {string} code - 卡密
   * @param {Object} client - 可选的数据库客户端
   */
  async findByCodeWithLock(code, client = null) {
    const db = client || getPool();
    const result = await db.query(
      `SELECT * FROM verification_codes
       WHERE code = $1 AND status = 'active'
       FOR UPDATE`,
      [code]
    );
    return result.rows[0];
  }

  /**
   * 根据卡密查询
   * @param {string} code - 卡密
   */
  async findByCode(code) {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM verification_codes WHERE code = $1',
      [code]
    );
    return result.rows[0];
  }

  /**
   * 创建卡密
   * @param {string} code - 卡密
   * @param {number} points - 点数
   */
  async create(code, points) {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO verification_codes (code, points, status)
       VALUES ($1, $2, 'active')
       RETURNING *`,
      [code, points]
    );
    return result.rows[0];
  }

  /**
   * 更新卡密状态为已使用
   * @param {string} code - 卡密
   * @param {Object} client - 可选的数据库客户端
   */
  async markAsUsed(code, client = null) {
    const db = client || getPool();
    const result = await db.query(
      `UPDATE verification_codes
       SET status = 'used', used_at = NOW()
       WHERE code = $1
       RETURNING *`,
      [code]
    );
    return result.rows[0];
  }

  /**
   * 删除卡密
   * @param {string} code - 卡密
   */
  async delete(code) {
    const pool = getPool();
    const result = await pool.query(
      'DELETE FROM verification_codes WHERE code = $1 RETURNING code',
      [code]
    );
    return result.rows.length > 0;
  }

  /**
   * 获取卡密列表（分页）
   * @param {Object} options - 查询选项
   */
  async findList(options = {}) {
    const {
      status = 'all',
      limit = 100,
      offset = 0,
    } = options;

    const pool = getPool();
    const params = [];
    let whereClause = '';

    // 构建查询条件
    if (status !== 'all') {
      whereClause = 'WHERE status = $1';
      params.push(status);
    }

    // 获取总数
    const countQuery = `SELECT COUNT(*) FROM verification_codes ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // 获取列表
    params.push(limit, offset);
    const listQuery = `
      SELECT * FROM verification_codes
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;
    const result = await pool.query(listQuery, params);

    return {
      codes: result.rows,
      total,
      count: result.rows.length,
    };
  }

  /**
   * 获取统计数据
   */
  async getStats() {
    const pool = getPool();
    const result = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'used') as used,
        COALESCE(SUM(points), 0) as total_points,
        COALESCE(SUM(points) FILTER (WHERE status = 'used'), 0) as used_points
      FROM verification_codes
    `);

    const row = result.rows[0];
    return {
      totalCodes: parseInt(row.total),
      activeCodes: parseInt(row.active),
      usedCodes: parseInt(row.used),
      totalPoints: parseInt(row.total_points),
      usedPoints: parseInt(row.used_points),
    };
  }

  /**
   * 批量创建卡密
   * @param {Array} codesData - [{code, points}, ...]
   */
  async batchCreate(codesData) {
    const pool = getPool();
    const client = await pool.connect();

    try {
      const created = [];

      for (const { code, points } of codesData) {
        const result = await client.query(
          `INSERT INTO verification_codes (code, points, status)
           VALUES ($1, $2, 'active')
           ON CONFLICT (code) DO NOTHING
           RETURNING *`,
          [code, points]
        );

        if (result.rows.length > 0) {
          created.push(result.rows[0]);
        }
      }

      return created;
    } finally {
      client.release();
    }
  }
}

module.exports = new CodeRepository();
