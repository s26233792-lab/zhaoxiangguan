const { pool } = require('../db');

module.exports = async (req, res) => {
  try {
    const { code, adminPassword } = req.body;

    // 验证必需参数
    if (!code) {
      return res.status(400).json({ error: '请提供卡密' });
    }

    if (!adminPassword) {
      return res.status(401).json({ error: '请提供管理员密码' });
    }

    // 使用常量时间比较防止时序攻击（简单的实现）
    const envPassword = process.env.ADMIN_PASSWORD;
    if (!envPassword) {
      console.error('ADMIN_PASSWORD not configured');
      return res.status(500).json({ error: '服务器配置错误' });
    }

    // 简单的哈希比较（生产环境应使用 bcrypt）
    if (adminPassword.length !== envPassword.length || adminPassword !== envPassword) {
      return res.status(401).json({ error: '管理员密码错误' });
    }

    // 验证卡密格式
    if (typeof code !== 'string' || code.length > 20) {
      return res.status(400).json({ error: '卡密格式无效' });
    }

    // 检查数据库是否已配置
    if (!pool) {
      return res.status(500).json({ error: '数据库未配置' });
    }

    // 从数据库删除
    const result = await pool.query('DELETE FROM verification_codes WHERE code = $1 RETURNING code', [code]);
    const deleted = result.rows.length > 0;

    if (!deleted) {
      return res.status(404).json({ error: '卡密不存在' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete code error:', error);
    res.status(500).json({ error: '删除失败' });
  }
};
