let supabase = null;
let pool = null;

// Supabase 客户端
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// 如果使用 Railway PostgreSQL
if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
}

// 开发模式：如果没有数据库配置，使用内存存储
if (!supabase && !pool) {
  console.warn('⚠️  未配置数据库，使用内存存储模式（仅用于开发测试）');

  // 简单的内存存储
  const memoryStore = {
    verification_codes: {},
    user_credits: {},
    usage_logs: []
  };

  // 模拟 Supabase 客户端接口
  supabase = {
    from: (table) => {
      return {
        select: (columns) => ({
          eq: (field, value) => ({
            single: async () => {
              const items = Object.values(memoryStore[table] || {});
              const found = items.find(item => item[field] === value);
              return { data: found || null, error: found ? null : { message: 'Not found' } };
            }
          }),
          order: () => ({
            range: () => ({
              then: (cb) => {
                const items = Object.values(memoryStore[table] || {});
                cb({ data: items, error: null });
              }
            })
          })
        }),
        insert: (data) => ({
          select: () => ({
            single: async () => {
              if (Array.isArray(data)) {
                data.forEach(item => {
                  if (item.code) memoryStore.verification_codes[item.code] = item;
                });
              } else {
                if (data.code) memoryStore.verification_codes[data.code] = data;
              }
              return { data: data, error: null };
            }
          })
        }),
        update: (data) => ({
          eq: (field, value) => {
            if (table === 'verification_codes') {
              const code = Object.keys(memoryStore.verification_codes).find(k => k === value);
              if (code) {
                memoryStore.verification_codes[code] = { ...memoryStore.verification_codes[code], ...data };
              }
            }
            if (table === 'user_credits') {
              const device = Object.keys(memoryStore.user_credits).find(k => k === value);
              if (device) {
                memoryStore.user_credits[device] = { ...memoryStore.user_credits[device], ...data };
              }
            }
            return { error: null };
          }
        })
      };
    }
  };
}

module.exports = { supabase, pool };
