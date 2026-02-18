/**
 * 美式照相馆 - 服务器入口
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/env');
const { healthCheck } = require('./config/database');
const { initDatabase } = require('../database/init-db');
const logger = require('./utils/logger');

// 导入中间件
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// 导入路由
const apiRoutes = require('./routes');

// 创建 Express 应用
const app = express();

// ==================== 基础中间件 ====================

app.use(cors());
app.use(express.json({
  limit: '6mb',
  strict: true,
}));
app.use(express.static('public'));

// 请求日志
app.use((req, res, next) => {
  logger.request(req);
  next();
});

// ==================== API 路由 ====================

// 统一API前缀
app.use('/api', apiRoutes);

// ==================== 健康检查 ====================

app.get('/health', async (req, res) => {
  const dbHealth = await healthCheck();

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV,
    database: dbHealth,
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
app.use(notFoundHandler);

// 全局错误处理
app.use(errorHandler);

// ==================== 启动服务器 ====================

async function start() {
  const PORT = config.PORT;

  try {
    // 初始化数据库（如果配置了DATABASE_URL）
    if (config.hasDatabase()) {
      await initDatabase();
    }

    // 启动服务器
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${config.NODE_ENV}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);

      if (config.isDevelopment()) {
        logger.info(`Admin panel: http://localhost:${PORT}/admin`);
      }
    });

  } catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
  }
}

// 优雅关闭
async function shutdown() {
  logger.info('Shutting down gracefully...');

  const { closePool } = require('./config/database');
  await closePool();

  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// 启动
start();

module.exports = app;
