const { supabase } = require('../db');

module.exports = async (req, res) => {
  try {
    // 获取验证码统计
    const { data: codesData, error: codesError } = await supabase
      .from('verification_codes')
      .select('status, points');

    // 获取用户统计
    const { count: userCount, error: userError } = await supabase
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

    return res.json({
      totalCodes,
      activeCodes,
      usedCodes,
      totalPoints,
      usedPoints,
      totalUsers: userCount || 0
    });

  } catch (error) {
    console.error('获取统计失败:', error);
    return res.status(500).json({ error: '获取统计失败' });
  }
};
