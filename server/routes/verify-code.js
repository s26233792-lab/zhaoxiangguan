const { pool } = require('../db');

// POST 验证卡密并发放积分（原子操作）
exports.post = async (req, res) => {
  // 检查数据库是否已配置
  if (!pool) {
    return res.status(500).json({ error: '数据库未配置' });
  }

  const client = await pool.connect().catch(() => null);

  // 如果无法获取数据库连接
  if (!client) {
    return res.status(500).json({ error: '数据库连接失败' });
  }

  try {
    const { code, deviceId } = req.body;

    // 参数验证
    if (!code) {
      return res.status(400).json({ error: '请输入验证码' });
    }

    if (typeof code !== 'string') {
      return res.status(400).json({ error: '验证码格式无效' });
    }

    const cleanCode = code.trim().toUpperCase();

    if (cleanCode.length > 20) {
      return res.status(400).json({ error: '验证码格式无效' });
    }

    if (!deviceId || typeof deviceId !== 'string' || deviceId.length > 100) {
      return res.status(400).json({ error: '设备ID格式无效' });
    }

    // 使用 PostgreSQL 事务确保原子性
    await client.query('BEGIN');

    try {
      // 1. 查询并锁定验证码记录
      const codeResult = await client.query(
        `SELECT points, status FROM verification_codes
         WHERE code = $1 AND status = 'active'
         FOR UPDATE`,
        [cleanCode]
      );

      if (codeResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: '验证码不存在或已使用' });
      }

      const points = codeResult.rows[0].points;

      // 2. 更新验证码状态
      await client.query(
        `UPDATE verification_codes
         SET status = 'used', used_at = NOW()
         WHERE code = $1`,
        [cleanCode]
      );

      // 3. 记录使用日志
      await client.query(
        `INSERT INTO usage_logs (device_id, action) VALUES ($1, $2)`,
        [deviceId, `redeem_code:${cleanCode}`]
      );

      // 4. 更新或创建用户积分（UPSERT）
      const creditResult = await client.query(
        `INSERT INTO user_credits (device_id, credits) VALUES ($1, $2)
         ON CONFLICT (device_id) DO UPDATE
         SET credits = user_credits.credits + $2, updated_at = NOW()
         RETURNING credits`,
        [deviceId, points]
      );

      await client.query('COMMIT');

      return res.json({
        success: true,
        points,
        remaining: creditResult.rows[0].credits,
        message: `验证成功，+${points} 点数`
      });

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }

  } catch (error) {
    console.error('验证失败:', error);
    return res.status(500).json({ error: '验证失败，请稍后重试' });
  } finally {
    if (client) client.release();
  }
};

// GET 查询卡密状态
exports.get = async (req, res) => {
  try {
    const code = req.query.code;

    if (!code) {
      return res.status(400).json({ error: '请提供验证码' });
    }

    if (typeof code !== 'string' || code.length > 20) {
      return res.status(400).json({ error: '验证码格式无效' });
    }

    const cleanCode = code.trim().toUpperCase();

    let codeData = null;

    if (pool) {
      const result = await pool.query(
        'SELECT status, points, created_at FROM verification_codes WHERE code = $1',
        [cleanCode]
      );
      codeData = result.rows[0];
    } else {
      return res.status(500).json({ error: '数据库未配置' });
    }

    if (!codeData) {
      return res.status(404).json({ exists: false });
    }

    return res.json({
      exists: true,
      status: codeData.status,
      points: codeData.points
    });

  } catch (error) {
    console.error('查询失败:', error);
    return res.status(500).json({ error: '查询失败' });
  }
};
