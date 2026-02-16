const axios = require('axios');
const { supabase } = require('../db');

module.exports = async (req, res) => {
  try {
    const { image, prompt, deviceId } = req.body;

    // 检查积分
    if (deviceId) {
      const { data: creditData } = await supabase
        .from('user_credits')
        .select('credits')
        .eq('device_id', deviceId)
        .single();

      if (!creditData || creditData.credits < 1) {
        return res.status(400).json({ error: '积分不足，请先充值' });
      }
    }

    // 调用 Gemini Nano Banana API
    const apiEndpoint = process.env.API_ENDPOINT;
    const apiKey = process.env.API_KEY;

    if (!apiEndpoint || !apiKey) {
      return res.status(500).json({ error: 'API配置错误' });
    }

    const response = await axios.post(
      apiEndpoint,
      { image, prompt },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );

    // 扣除积分
    if (deviceId) {
      await supabase
        .from('user_credits')
        .update({
          credits: supabase.raw('credits - 1'),
          updated_at: new Date().toISOString()
        })
        .eq('device_id', deviceId);
    }

    // 返回生成的图片
    const contentType = response.headers['content-type'] || 'image/jpeg';
    res.set('Content-Type', contentType);
    res.send(response.data);

  } catch (error) {
    console.error('API Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    res.status(500).json({ error: '图片生成失败' });
  }
};
