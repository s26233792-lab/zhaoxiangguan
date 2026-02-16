const { supabase } = require('../db');

// GET 查询用户积分
exports.get = async (req, res) => {
  try {
    const { deviceId } = req.query;

    if (!deviceId) {
      return res.status(400).json({ error: '请提供设备ID' });
    }

    const { data, error } = await supabase
      .from('user_credits')
      .select('credits')
      .eq('device_id', deviceId)
      .single();

    if (error || !data) {
      return res.json({ credits: 0 });
    }

    return res.json({ credits: data.credits });

  } catch (error) {
    console.error('查询积分失败:', error);
    return res.status(500).json({ error: '查询失败' });
  }
};

// POST 消费积分
exports.post = async (req, res) => {
  try {
    const { deviceId, amount = 1 } = req.body;

    if (!deviceId) {
      return res.status(400).json({ error: '请提供设备ID' });
    }

    if (amount < 1) {
      return res.status(400).json({ error: '消费金额必须大于0' });
    }

    // 获取当前积分
    const { data: currentData } = await supabase
      .from('user_credits')
      .select('credits')
      .eq('device_id', deviceId)
      .single();

    if (!currentData || currentData.credits < amount) {
      return res.status(400).json({ error: '积分不足' });
    }

    // 扣除积分
    const { error } = await supabase
      .from('user_credits')
      .update({ credits: currentData.credits - amount, updated_at: new Date().toISOString() })
      .eq('device_id', deviceId);

    if (error) throw error;

    return res.json({
      success: true,
      remaining: currentData.credits - amount
    });

  } catch (error) {
    console.error('消费积分失败:', error);
    return res.status(500).json({ error: '消费失败' });
  }
};
