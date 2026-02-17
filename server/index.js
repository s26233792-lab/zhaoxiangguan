const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// ==================== 安全中间件 ====================

// 通用限流 - 防止 DDoS
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP最多100个请求
  message: { error: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 图片生成限流 - 更严格
const generateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 10, // 每分钟最多10次
  message: { error: '生成图片过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 管理后台限流
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 50, // 每个IP最多50个请求
  message: { error: '管理后台请求过于频繁' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 基础中间件
app.use(cors());
app.use(express.json({
  limit: '3mb', // 减小请求体大小限制
  strict: true // 严格解析，防止攻击
}));
app.use(express.static('public'));

// ==================== 请求验证中间件 ====================

// 验证请求数据格式
function validateGenerateRequest(req, res, next) {
  const { image, prompt, deviceId } = req.body;

  // 验证必需字段
  if (!image) {
    return res.status(400).json({ error: '请上传图片' });
  }

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: '请提供有效的风格描述' });
  }

  // 验证图片大小（base64后大约不超过3MB）
  if (image.length > 4 * 1024 * 1024) {
    return res.status(400).json({ error: '图片过大，请上传小于3MB的图片' });
  }

  // 验证图片格式
  if (!image.match(/^data:image\/(jpeg|jpg|png|webp);base64,/)) {
    return res.status(400).json({ error: '图片格式不支持，请上传 JPG/PNG/WEBP 格式' });
  }

  // 验证 prompt 长度
  if (prompt.length > 500) {
    return res.status(400).json({ error: '风格描述过长' });
  }

  // 验证 deviceId 格式
  if (deviceId && (typeof deviceId !== 'string' || deviceId.length > 100)) {
    return res.status(400).json({ error: '设备ID格式无效' });
  }

  next();
}

// 验证管理员密码
function validateAdminPassword(req, res, next) {
  const { adminPassword } = req.body;
  const envPassword = process.env.ADMIN_PASSWORD;

  if (!envPassword) {
    console.error('ADMIN_PASSWORD not configured');
    return res.status(500).json({ error: '服务器配置错误' });
  }

  if (!adminPassword || adminPassword !== envPassword) {
    return res.status(401).json({ error: '管理员密码错误' });
  }

  next();
}

// ==================== API 路由 ====================

// 公开API（限流）
app.get('/api/credits', generalLimiter, require('./routes/credits').get);
app.post('/api/verify-code', generalLimiter, require('./routes/verify-code').post);

// 需要积分的API（严格限流 + 验证）
app.post('/api/generate', generateLimiter, validateGenerateRequest, require('./routes/generate'));

// 管理员API（严格限流 + 密码验证）
app.post('/api/generate-codes', adminLimiter, validateAdminPassword, require('./routes/generate-codes').post);
app.get('/api/generate-codes', adminLimiter, validateAdminPassword, require('./routes/generate-codes').get);
app.get('/api/stats', adminLimiter, validateAdminPassword, require('./routes/stats'));
app.post('/api/delete-code', adminLimiter, validateAdminPassword, require('./routes/delete-code'));

// 健康检查端点（无限制）
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ==================== SPA 路由支持 ====================

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ==================== 错误处理 ====================

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: '请求的资源不存在' });
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // 请求体过大
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: '请求体过大' });
  }

  // JSON 解析错误
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: '请求数据格式错误' });
  }

  // 默认错误
  res.status(500).json({ error: '服务器内部错误' });
});

// ==================== 启动服务器 ====================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Rate limiting enabled`);
});
