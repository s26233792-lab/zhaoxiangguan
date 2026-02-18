const axios = require('axios');
const { pool } = require('../db');

module.exports = async (req, res) => {
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
    const { image, prompt, deviceId } = req.body;

    // ==================== 积分检查和扣除（事务保护） ====================
    if (deviceId) {
      await client.query('BEGIN');

      try {
        // 使用 PostgreSQL 原子操作：检查并扣除积分
        const result = await client.query(
          `UPDATE user_credits
           SET credits = credits - 1, updated_at = NOW()
           WHERE device_id = $1 AND credits >= 1
           RETURNING credits`,
          [deviceId]
        );

        if (result.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: '积分不足，请先充值' });
        }

      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    // ==================== 调用图片生成 API ====================
    const apiEndpoint = process.env.API_ENDPOINT;
    const apiKey = process.env.API_KEY;

    if (!apiEndpoint || !apiKey) {
      if (deviceId) await client.query('ROLLBACK');
      return res.status(500).json({ error: 'API配置错误' });
    }

    // 设置请求超时（防止长时间挂起）
    const response = await axios.post(
      apiEndpoint,
      { image, prompt },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer',
        timeout: 60000 // 60秒超时
      }
    );

    // ==================== 提交事务并返回图片 ====================
    if (deviceId) {
      await client.query('COMMIT');
    }

    const contentType = response.headers['content-type'] || 'image/jpeg';
    res.set('Content-Type', contentType);
    res.send(response.data);

  } catch (error) {
    // 回滚事务
    try {
      if (deviceId && client) await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('Rollback error:', rollbackErr);
    }

    console.error('API Error:', error.message);

    // 处理不同类型的错误
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({ error: 'API请求超时，请稍后重试' });
    }

    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: '图片生成服务暂时不可用' });
    }

    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data?.toString || error.response.data);

      if (error.response.status === 401) {
        return res.status(500).json({ error: 'API密钥无效，请联系管理员' });
      }

      if (error.response.status === 429) {
        return res.status(429).json({ error: 'API请求次数超限，请稍后重试' });
      }
    }

    res.status(500).json({ error: '图片生成失败，请稍后重试' });
  } finally {
    if (client) client.release();
  }
};
