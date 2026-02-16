const { supabase } = require('../db');

// 生成随机卡密
function generateCode(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// POST 生成卡密（需要管理员密码）
exports.post = async (req, res) => {
  try {
    const { points = 1, amount = 1, codeLength = 8, adminPassword } = req.body;

    // 验证管理员密码
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: '管理员密码错误' });
    }

    if (amount < 1 || amount > 1000) {
      return res.status(400).json({ error: '生成数量必须在 1-1000 之间' });
    }

    const generatedCodes = [];

    for (let i = 0; i < amount; i++) {
      let code;
      let exists = true;
      let attempts = 0;

      // 生成唯一码，避免重复
      while (exists && attempts < 100) {
        code = generateCode(codeLength);
        const { data } = await supabase
          .from('verification_codes')
          .select('code')
          .eq('code', code)
          .single();

        exists = !!data;
        attempts++;
      }

      const { data, error } = await supabase
        .from('verification_codes')
        .insert({
          code,
          points,
          status: 'active',
          sync_status: 'synced',
          last_sync_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('插入验证码失败:', error);
        generatedCodes.push({
          code,
          points,
          status: 'active',
          sync_status: 'failed',
          sync_error: error.message
        });
        continue;
      }

      generatedCodes.push({
        code,
        points,
        status: 'active',
        sync_status: 'synced',
        last_sync_at: new Date().toISOString()
      });
    }

    return res.json({
      success: true,
      codes: generatedCodes,
      count: generatedCodes.length,
      message: `已生成 ${generatedCodes.length} 张验证码`
    });

  } catch (error) {
    console.error('生成失败:', error);
    return res.status(500).json({ error: '生成失败，请稍后重试' });
  }
};

// GET 查询卡密列表（需要管理员密码）
exports.get = async (req, res) => {
  try {
    const { adminPassword, status = 'all', limit = 100, offset = 0 } = req.query;

    // 验证管理员密码
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: '管理员密码错误' });
    }

    const limitNum = Math.min(parseInt(limit) || 100, 1000);
    const offsetNum = parseInt(offset) || 0;

    // 先获取总数
    let countQuery = supabase
      .from('verification_codes')
      .select('*', { count: 'exact', head: true });

    if (status !== 'all') {
      countQuery = countQuery.eq('status', status);
    }

    const { count: totalCount, error: countError } = await countQuery;

    // 构建主查询
    let query = supabase
      .from('verification_codes')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1);

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: '获取失败' });
    }

    return res.json({
      codes: data || [],
      total: totalCount || 0,
      count: data ? data.length : 0
    });

  } catch (error) {
    console.error('获取列表失败:', error);
    return res.status(500).json({ error: '获取失败' });
  }
};
