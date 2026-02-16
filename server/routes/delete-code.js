const { supabase, pool } = require('../db');

module.exports = async (req, res) => {
  try {
    const { code, adminPassword } = req.body;

    // 验证管理员密码
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return res.status(403).json({ error: '管理员密码错误' });
    }

    // 从数据库删除
    if (supabase) {
      const { error } = await supabase
        .from('verification_codes')
        .delete()
        .eq('code', code);

      if (error) {
        return res.status(500).json({ error: '删除失败' });
      }
    } else if (pool) {
      await pool.query('DELETE FROM verification_codes WHERE code = $1', [code]);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete code error:', error);
    res.status(500).json({ error: '删除失败' });
  }
};
