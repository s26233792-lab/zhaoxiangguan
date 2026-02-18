/**
 * 环境变量配置管理
 */
require('dotenv').config();

const config = {
  // 服务器配置
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // 数据库配置
  DATABASE_URL: process.env.DATABASE_URL,

  // API 配置
  API_ENDPOINT: process.env.API_ENDPOINT,
  API_KEY: process.env.API_KEY,
  API_TIMEOUT: parseInt(process.env.API_TIMEOUT) || 60000,
  NANOBANANA_MODEL: process.env.NANOBANANA_MODEL || 'gemini-3-pro-image-preview',

  // 管理员配置
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,

  // 日志配置
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // 限流配置
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000,
    GENERAL_MAX: 100,
    GENERATE_WINDOW_MS: 60 * 1000,
    GENERATE_MAX: 10,
    ADMIN_MAX: 50,
  },

  // 辅助方法
  isProduction: () => (process.env.NODE_ENV || 'development') === 'production',
  isDevelopment: () => (process.env.NODE_ENV || 'development') === 'development',
  hasDatabase: () => !!process.env.DATABASE_URL,

  // 验证必需的环境变量
  validate: () => {
    const required = [];
    const optional = [];

    if (!process.env.ADMIN_PASSWORD) required.push('ADMIN_PASSWORD');
    if (!process.env.API_ENDPOINT) optional.push('API_ENDPOINT');
    if (!process.env.API_KEY) optional.push('API_KEY');

    if (required.length > 0) {
      throw new Error(`Missing required environment variables: ${required.join(', ')}`);
    }

    if (optional.length > 0) {
      console.warn(`Warning: Optional environment variables not set: ${optional.join(', ')}`);
    }

    return true;
  }
};

// 启动时验证
try {
  config.validate();
} catch (err) {
  console.error('Configuration Error:', err.message);
  if (config.isProduction()) {
    process.exit(1);
  }
}

module.exports = config;
