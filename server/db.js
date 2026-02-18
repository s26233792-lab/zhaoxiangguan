/**
 * 数据库连接（兼容旧代码）
 * 新架构请使用 config/database.js
 */
const { getPool } = require('./config/database');

module.exports = {
  pool: {
    get query() {
      const pool = getPool();
      if (!pool) {
        throw new Error('Database not available');
      }
      return pool.query.bind(pool);
    },
    get connect() {
      const pool = getPool();
      if (!pool) {
        throw new Error('Database not available');
      }
      return pool.connect.bind(pool);
    },
  },
};
