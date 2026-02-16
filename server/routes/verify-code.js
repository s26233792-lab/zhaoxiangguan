const { supabase } = require('../db');

// POST 验证卡密并发放积分
exports.post = async (req, res) => {
  try {
    const { code, deviceId } = req.body;

    if (!code) {
      return res.status(400).json({ error: '请输入验证码' });
    }

    const cleanCode = code.trim().toUpperCase();

    // 查询验证码
    const { data: codeData, error: queryError } = await supabase
      .from('verification_codes')
      .select('points, status')
      .eq('code', cleanCode)
      .single();

    if (queryError || !codeData) {
      return res.status(404).json({ error: '验证码不存在' });
    }

    if (codeData.status !== 'active') {
      return res.status(400).json({ error: '验证码已使用' });
    }

    const points = codeData.points;

    // 更新验证码状态为已使用
    const { error: updateError } = await supabase
      .from('verification_codes')
      .update({ status: 'used', used_at: new Date().toISOString() })
      .eq('code', cleanCode);

    if (updateError) throw updateError;

    // 记录使用日志
    await supabase
      .from('usage_logs')
      .insert({ code: cleanCode, points, device_id: deviceId });

    // 更新用户积分
    if (deviceId) {
      const { data: existingCredit } = await supabase
        .from('user_credits')
        .select('credits')
        .eq('device_id', deviceId)
        .single();

      if (existingCredit) {
        await supabase
          .from('user_credits')
          .update({ credits: existingCredit.credits + points, updated_at: new Date().toISOString() })
          .eq('device_id', deviceId);
      } else {
        await supabase
          .from('user_credits')
          .insert({ device_id: deviceId, credits: points });
      }
    }

    return res.json({
      success: true,
      points,
      message: `验证成功，+${points} 点数`
    });

  } catch (error) {
    console.error('验证失败:', error);
    return res.status(500).json({ error: '验证失败，请稍后重试' });
  }
};

// GET 查询卡密状态
exports.get = async (req, res) => {
  try {
    const code = req.query.code;

    if (!code) {
      return res.status(400).json({ error: '请提供验证码' });
    }

    const cleanCode = code.trim().toUpperCase();

    const { data, error } = await supabase
      .from('verification_codes')
      .select('status, points, created_at')
      .eq('code', cleanCode)
      .single();

    if (error || !data) {
      return res.status(404).json({ exists: false });
    }

    return res.json({
      exists: true,
      status: data.status,
      points: data.points
    });

  } catch (error) {
    console.error('查询失败:', error);
    return res.status(500).json({ error: '查询失败' });
  }
};
