const { pool } = require('../db');

// GET 查询用户积分
exports.get = async (req, res) => {
  try {
    const { deviceId } = req.query;

    if (!deviceId) {
      return res.json({ credits: 0 });
    }

    // 验证 deviceId 格式
    if (typeof deviceId !== 'string' || deviceId.length > 100) {
      return res.status(400).json({ error: '设备ID格式无效' });
    }

    const result = await pool.query(
      'SELECT credits FROM user_credits WHERE device_id = $1',
      [deviceId]
    );
    const credits = result.rows[0]?.credits || 0;

    return res.json({ credits });

  } catch (error) {
    console.error('查询积分失败:', error);
    return res.json({ credits: 0 }); // 出错时返回0，不暴露错误
  }
};

// POST 充值积分（通过验证码）
exports.post = async (req, res) => {
  const client = await pool.connect().catch(() => null);

  try {
    const { deviceId, amount = 1 } = req.body;

    // 参数验证
    if (!deviceId) {
      return res.status(400).json({ error: '请提供设备ID' });
    }

    if (typeof deviceId !== 'string' || deviceId.length > 100) {
      return res.status(400).json({ error: '设备ID格式无效' });
    }

    if (typeof amount !== 'number' || amount < 1 || amount > 1000) {
      return res.status(400).json({ error: '充值金额无效' });
    }

    // 使用 PostgreSQL 原子操作充值
    const result = await client.query(
      `INSERT INTO user_credits (device_id, credits) VALUES ($1, $2)
       ON CONFLICT (device_id) DO UPDATE
       SET credits = user_credits.credits + $2, updated_at = NOW()
       RETURNING credits`,
      [deviceId, amount]
    );

    return res.json({
      success: true,
      remaining: result.rows[0].credits
    });

  } catch (error) {
    console.error('充值积分失败:', error);
    return res.status(500).json({ error: '充值失败' });
  } finally {
    if (client) client.release();
  }
};
