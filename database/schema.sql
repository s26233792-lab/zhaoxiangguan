-- ============================================
-- 美式照相馆 - 数据库Schema初始化脚本
-- 数据库: PostgreSQL
-- ============================================

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 表1: 验证码表
-- ============================================
CREATE TABLE IF NOT EXISTS verification_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    points INTEGER NOT NULL CHECK (points > 0),
    status VARCHAR(20) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    used_at TIMESTAMP WITH TIME ZONE
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_verification_codes_code ON verification_codes(code);
CREATE INDEX IF NOT EXISTS idx_verification_codes_status ON verification_codes(status);
CREATE INDEX IF NOT EXISTS idx_verification_codes_created_at ON verification_codes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_verification_codes_status_created ON verification_codes(status, created_at DESC);

-- 约束
ALTER TABLE verification_codes
DROP CONSTRAINT IF EXISTS chk_verification_codes_status;
ALTER TABLE verification_codes
ADD CONSTRAINT chk_verification_codes_status CHECK (status IN ('active', 'used'));

-- 注释
COMMENT ON TABLE verification_codes IS '卡密验证码表，存储管理员生成的兑换码';
COMMENT ON COLUMN verification_codes.code IS '卡密代码，8位大写字母数字组合';
COMMENT ON COLUMN verification_codes.points IS '卡密对应的积分数量';
COMMENT ON COLUMN verification_codes.status IS '状态: active=可用, used=已使用';

-- ============================================
-- 表2: 用户积分表
-- ============================================
CREATE TABLE IF NOT EXISTS user_credits (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(100) UNIQUE NOT NULL,
    credits INTEGER DEFAULT 0 NOT NULL CHECK (credits >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_user_credits_device_id ON user_credits(device_id);
CREATE INDEX IF NOT EXISTS idx_user_credits_updated_at ON user_credits(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_credits_credits ON user_credits(credits);

-- 注释
COMMENT ON TABLE user_credits IS '用户积分表，基于设备ID管理';
COMMENT ON COLUMN user_credits.device_id IS '设备唯一标识，由客户端生成';
COMMENT ON COLUMN user_credits.credits IS '当前可用积分余额';

-- ============================================
-- 表3: 使用日志表
-- ============================================
CREATE TABLE IF NOT EXISTS usage_logs (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_usage_logs_device_id ON usage_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_action ON usage_logs(action);
CREATE INDEX IF NOT EXISTS idx_usage_logs_device_created ON usage_logs(device_id, created_at DESC);

-- 注释
COMMENT ON TABLE usage_logs IS '用户操作日志表';
COMMENT ON COLUMN usage_logs.action IS '操作类型，如: redeem_code:ABCD1234';
COMMENT ON COLUMN usage_logs.metadata IS '额外信息，JSON格式存储';

-- ============================================
-- 初始化完成提示
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Database schema initialized successfully!';
    RAISE NOTICE 'Tables: verification_codes, user_credits, usage_logs';
    RAISE NOTICE '====================================';
END $$;
