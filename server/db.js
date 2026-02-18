let pool = null;

// Railway PostgreSQL
if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
}

// 开发模式：如果没���数据库配置，使用内存存储
if (!pool) {
  console.warn('⚠️  未配置数据库，使用内存存储模式（仅用于开发测试）');

  // 简单的内存存储
  const memoryStore = {
    verification_codes: {},
    user_credits: {},
    usage_logs: []
  };

  // 创建模拟的 pool 接口
  pool = {
    query: async (text, params) => {
      // 模拟 SQL 查询（简化版，仅用于开发测试）
      if (text.includes('SELECT')) {
        // 优先检查 COUNT 查询
        if (text.includes('COUNT(*)')) {
          if (text.includes('verification_codes')) {
            return { rows: [{ count: Object.keys(memoryStore.verification_codes).length }] };
          }
          if (text.includes('user_credits')) {
            return { rows: [{ count: Object.keys(memoryStore.user_credits).length }] };
          }
        }

        if (text.includes('verification_codes')) {
          const codes = Object.values(memoryStore.verification_codes);
          if (text.includes('WHERE code = $1')) {
            const found = codes.find(c => c.code === params[0]);
            return { rows: found ? [found] : [] };
          }
          if (text.includes('WHERE status =')) {
            const filtered = codes.filter(c => c.status === params[0]);
            return { rows: filtered };
          }
          // 支持 ORDER BY, LIMIT, OFFSET（简化处理）
          return { rows: codes.reverse() }; // 反转模拟 ORDER BY created_at DESC
        }
        if (text.includes('user_credits')) {
          const credits = Object.values(memoryStore.user_credits);
          if (text.includes('WHERE device_id = $1')) {
            const found = credits.find(c => c.device_id === params[0]);
            return { rows: found ? [found] : [] };
          }
          return { rows: credits };
        }
        return { rows: [] };
      }

      if (text.includes('INSERT')) {
        if (text.includes('verification_codes')) {
          // 使用 params 数组获取实际值
          const code = params[0];
          const points = params[1];
          const status = params[2] || 'active';
          memoryStore.verification_codes[code] = {
            code,
            points,
            status,
            created_at: new Date().toISOString()
          };
        }
        if (text.includes('user_credits')) {
          const deviceId = params[0];
          const credits = params[1];
          const existing = memoryStore.user_credits[deviceId];

          if (text.includes('ON CONFLICT') && existing) {
            // UPSERT: 更新现有记录
            existing.credits += credits;
            existing.updated_at = new Date().toISOString();
            return { rows: [{ credits: existing.credits }] };
          } else {
            // INSERT: 创建新记录
            memoryStore.user_credits[deviceId] = {
              device_id: deviceId,
              credits: credits,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            return { rows: [{ credits: credits }] };
          }
        }
        if (text.includes('usage_logs')) {
          memoryStore.usage_logs.push({
            device_id: params[0],
            action: params[1],
            created_at: new Date().toISOString()
          });
        }
        return { rows: [] };
      }

      if (text.includes('UPDATE')) {
        if (text.includes('verification_codes')) {
          const code = params[0];
          if (memoryStore.verification_codes[code]) {
            memoryStore.verification_codes[code].status = 'used';
            memoryStore.verification_codes[code].used_at = new Date().toISOString();
          }
          return { rows: [] };
        }
        if (text.includes('user_credits')) {
          const deviceId = params[0];
          if (memoryStore.user_credits[deviceId]) {
            memoryStore.user_credits[deviceId].credits -= 1;
            memoryStore.user_credits[deviceId].updated_at = new Date().toISOString();
            return { rows: [{ credits: memoryStore.user_credits[deviceId].credits }] };
          }
          // 如果没有找到，返回空结果（UPDATE 的 WHERE 条件未满足）
          return { rows: [] };
        }
        return { rows: [] };
      }

      if (text.includes('DELETE')) {
        if (text.includes('verification_codes')) {
          const code = params[0];
          delete memoryStore.verification_codes[code];
          return { rows: [{ code }] };
        }
        return { rows: [] };
      }

      return { rows: [] };
    },

    connect: async () => ({
      query: pool.query,
      release: () => {}
    })
  };
}

module.exports = { pool };
