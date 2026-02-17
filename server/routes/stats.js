const { supabase, pool } = require('../db');

module.exports = async (req, res) => {
  try {
    let stats = {
      totalCodes: 0,
      activeCodes: 0,
      usedCodes: 0,
      totalPoints: 0,
      usedPoints: 0,
      totalUsers: 0
    };

    // 使用 PostgreSQL 原生聚合查询（更快）
    if (pool) {
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

      stats = {
        totalCodes: parseInt(codeStats.rows[0].total),
        activeCodes: parseInt(codeStats.rows[0].active),
        usedCodes: parseInt(codeStats.rows[0].used),
        totalPoints: parseInt(codeStats.rows[0].total_points),
        usedPoints: parseInt(codeStats.rows[0].used_points),
        totalUsers: parseInt(userStats.rows[0].count)
      };

      return res.json(stats);
    }

    // Supabase 模式（需要获取所有数据）
    if (supabase) {
      // 获取验证码统计
      const { data: codesData, error: codesError } = await supabase
        .from('verification_codes')
        .select('status, points');

      // 获取用户统计
      const { count: userCount } = await supabase
        .from('user_credits')
        .select('*', { count: 'exact', head: true });

      if (codesError) {
        return res.status(500).json({ error: '获取统计数据失败' });
      }

      const totalCodes = codesData ? codesData.length : 0;
      const activeCodes = codesData ? codesData.filter(c => c.status === 'active').length : 0;
      const usedCodes = codesData ? codesData.filter(c => c.status === 'used').length : 0;
      const totalPoints = codesData ? codesData.reduce((sum, c) => sum + (c.points || 0), 0) : 0;
      const usedPoints = codesData ? codesData.filter(c => c.status === 'used').reduce((sum, c) => sum + (c.points || 0), 0) : 0;

      stats = {
        totalCodes,
        activeCodes,
        usedCodes,
        totalPoints,
        usedPoints,
        totalUsers: userCount || 0
      };
    }

    return res.json(stats);

  } catch (error) {
    console.error('获取统计失败:', error);
    return res.status(500).json({ error: '获取统计失败' });
  }
};
