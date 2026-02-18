/**
 * 数据库连接配置
 */
const { Pool } = require('pg');
const config = require('./env');

let pool = null;

/**
 * 创建数据库连接池
 */
function createPool() {
  if (!config.hasDatabase()) {
    console.warn('⚠️  DATABASE_URL not configured, using memory storage mode (development only)');
    return null;
  }

  pool = new Pool({
    connectionString: config.DATABASE_URL,
    ssl: config.isProduction() ? { rejectUnauthorized: false } : false,
    max: 20, // 最大连接数
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  // 监听连接事件
  pool.on('connect', () => {
    console.log('✅ Database connected');
  });

  pool.on('error', (err) => {
    console.error('❌ Database pool error:', err);
  });

  // 测试连接
  pool.query('SELECT NOW()')
    .then(() => console.log('✅ Database connection verified'))
    .catch(err => console.error('❌ Database connection failed:', err.message));

  return pool;
}

/**
 * 获取数据库连接池
 */
function getPool() {
  if (!pool) {
    pool = createPool();
  }
  return pool;
}

/**
 * 关闭数据库连接池
 */
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('Database connection closed');
  }
}

/**
 * 健康检查
 */
async function healthCheck() {
  if (!pool) {
    return { status: 'disabled', message: 'Database not configured' };
  }

  try {
    const result = await pool.query('SELECT NOW() as timestamp');
    return {
      status: 'healthy',
      timestamp: result.rows[0].timestamp,
    };
  } catch (err) {
    return {
      status: 'unhealthy',
      error: err.message,
    };
  }
}

// 优雅关闭
process.on('SIGTERM', closePool);
process.on('SIGINT', closePool);

module.exports = {
  getPool,
  createPool,
  closePool,
  healthCheck,
};
