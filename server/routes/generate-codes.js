const crypto = require('crypto');
const { pool } = require('../db');

// 生成加密安全的随机卡密
function generateSecureCode(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const randomBytes = crypto.randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) {
    // 使用随机字节来选择字符，比 Math.random() 更安全
    code += chars[randomBytes[i] % chars.length];
  }
  return code;
}

// POST 生成卡密（需要管理员密码）
exports.post = async (req, res) => {
  try {
    const { points = 1, amount = 1, codeLength = 8, adminPassword } = req.body;

    // 验证管理员密码（现在在中间件层已验证，这里做二次检查）
    const envPassword = process.env.ADMIN_PASSWORD;
    if (!envPassword || adminPassword !== envPassword) {
      return res.status(401).json({ error: '管理员密码错误' });
    }

    // 参数验证
    if (typeof points !== 'number' || points < 1 || points > 1000) {
      return res.status(400).json({ error: '点数必须在 1-1000 之间' });
    }

    if (typeof amount !== 'number' || amount < 1 || amount > 1000) {
      return res.status(400).json({ error: '生成数量必须在 1-1000 之间' });
    }

    if (typeof codeLength !== 'number' || codeLength < 4 || codeLength > 20) {
      return res.status(400).json({ error: '卡密长度必须在 4-20 之间' });
    }

    const generatedCodes = [];

    // 使用批量插入提高性能
    if (pool) {
      for (let i = 0; i < amount; i++) {
        let code;
        let exists = true;
        let attempts = 0;
        const maxAttempts = 100;

        // 生成唯一码，避免重复
        while (exists && attempts < maxAttempts) {
          code = generateSecureCode(codeLength);

          const result = await pool.query(
            'SELECT code FROM verification_codes WHERE code = $1',
            [code]
          );

          exists = result.rows.length > 0;
          attempts++;
        }

        if (attempts >= maxAttempts) {
          console.error('无法生成唯一卡密');
          continue;
        }

        // 插入数据库
        await pool.query(
          `INSERT INTO verification_codes (code, points, status)
           VALUES ($1, $2, 'active')`,
          [code, points]
        );

        generatedCodes.push({ code, points, status: 'active' });
      }

      return res.json({
        success: true,
        codes: generatedCodes,
        count: generatedCodes.length,
        message: `已生成 ${generatedCodes.length} 张验证码`
      });
    }

    return res.status(500).json({ error: '数据库未配置' });

  } catch (error) {
    console.error('生成失败:', error);
    return res.status(500).json({ error: '生成失败，请稍后重试' });
  }
};

// GET 查询卡密列表（需要管理员密码）
exports.get = async (req, res) => {
  try {
    const { adminPassword, status = 'all', limit = 100, offset = 0 } = req.query;

    // 验证管理员密码（现在在中间件层已验证）
    const envPassword = process.env.ADMIN_PASSWORD;
    if (!envPassword || adminPassword !== envPassword) {
      return res.status(401).json({ error: '管理员密码错误' });
    }

    const limitNum = Math.min(parseInt(limit) || 100, 1000);
    const offsetNum = Math.max(0, parseInt(offset) || 0);

    // 验证状态参数
    if (status !== 'all' && status !== 'active' && status !== 'used') {
      return res.status(400).json({ error: '状态参数无效' });
    }

    let codes = [];
    let totalCount = 0;

    if (pool) {
      // 获取总数
      let countQuery = 'SELECT COUNT(*) FROM verification_codes';
      let countParams = [];
      if (status !== 'all') {
        countQuery += ' WHERE status = $1';
        countParams = [status];
      }
      const countResult = await pool.query(countQuery, countParams);
      totalCount = parseInt(countResult.rows[0].count);

      // 获取列表
      let listQuery = 'SELECT * FROM verification_codes';
      let listParams = [];
      if (status !== 'all') {
        listQuery += ' WHERE status = $1';
        listParams = [status];
      }
      listQuery += ' ORDER BY created_at DESC LIMIT $1 OFFSET $2';
      listParams.push(limitNum, offsetNum);

      const result = await pool.query(listQuery, listParams);
      codes = result.rows;
    } else {
      return res.status(500).json({ error: '数据库未配置' });
    }

    return res.json({
      codes,
      total: totalCount,
      count: codes.length
    });

  } catch (error) {
    console.error('获取列表失败:', error);
    return res.status(500).json({ error: '获取失败' });
  }
};
