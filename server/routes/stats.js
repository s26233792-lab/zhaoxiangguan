const { pool } = require('../db');

module.exports = async (req, res) => {
  try {
    // 验证码统计
    const codeStats = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'used') as used,
        COALESCE(SUM(points), 0) as total_points,
        COALESCE(SUM(points) FILTER (WHERE status = 'used'), 0) as used_points
      FROM verification_codes
    `);

    // 用户统计
    const userStats = await pool.query('SELECT COUNT(*) as count FROM user_credits');

    const stats = {
      totalCodes: parseInt(codeStats.rows[0].total),
      activeCodes: parseInt(codeStats.rows[0].active),
      usedCodes: parseInt(codeStats.rows[0].used),
      totalPoints: parseInt(codeStats.rows[0].total_points),
      usedPoints: parseInt(codeStats.rows[0].used_points),
      totalUsers: parseInt(userStats.rows[0].count)
    };

    return res.json(stats);

  } catch (error) {
    console.error('获取统计失败:', error);
    return res.status(500).json({ error: '获取统计失败' });
  }
};
