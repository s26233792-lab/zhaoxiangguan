/**
 * 数据库初始化脚本
 * 用于 Railway 部署时自动创建表结构
 */
const fs = require('fs');
const path = require('path');
const config = require('../server/config/env');

async function initDatabase() {
  if (!config.hasDatabase()) {
    console.log('⚠️  DATABASE_URL not configured, skipping database initialization');
    return;
  }

  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: config.DATABASE_URL,
    ssl: config.isProduction() ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔧 Initializing database...');

    // 读取schema文件
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // 执行schema
    await pool.query(schema);

    console.log('✅ Database initialized successfully!');
    console.log('📊 Tables created: verification_codes, user_credits, usage_logs');

  } catch (err) {
    console.error('❌ Database initialization failed:', err.message);
    throw err;
  } finally {
    await pool.end();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { initDatabase };
