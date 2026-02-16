const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// API 路由
app.post('/api/generate', require('./routes/generate'));
app.post('/api/verify-code', require('./routes/verify-code').post);
app.get('/api/verify-code', require('./routes/verify-code').get);
app.post('/api/generate-codes', require('./routes/generate-codes').post);
app.get('/api/generate-codes', require('./routes/generate-codes').get);
app.get('/api/credits', require('./routes/credits').get);
app.post('/api/credits', require('./routes/credits').post);
app.get('/api/stats', require('./routes/stats'));

// 删除卡密路由
app.post('/api/delete-code', require('./routes/delete-code'));

// SPA 路由支持（前端刷新不会404）
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
