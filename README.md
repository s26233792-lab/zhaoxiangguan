# 美式照相馆 - AI图片生成工具

一个简单的图片生成网页，用户上传图片后输入提示词，调用 Gemini Nano Banana API 进行图生图。

## 功能特性

- 图片上传 + 提示词输入 → API生成图片
- 卡密验证码系统（用户兑换卡密获得生成次数）
- 积分系统（基于设备ID管理用户积分）
- 管理后台（生成/查询卡密，查看统计数据）

## 技术栈

- 前端: 纯 HTML + CSS + JavaScript
- 后端: Node.js + Express
- 数据库: Supabase (PostgreSQL) 或 Railway PostgreSQL
- 部署: Railway / Vercel

## 快速开始

### 1. 安装依赖

```bash
cd 美式照相馆最终版
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，填入你的配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：
```env
# Supabase 配置
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# 图片生成 API
API_ENDPOINT=https://api.example.com/v1/generate
API_KEY=your_api_key_here

# 管理员密码
ADMIN_PASSWORD=your_admin_password
```

### 3. 创建数据库表

在 Supabase SQL Editor 中执行：

```sql
-- 验证码表
CREATE TABLE verification_codes (
  code TEXT PRIMARY KEY,
  points INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'synced',
  sync_error TEXT,
  last_sync_at TIMESTAMPTZ DEFAULT NOW()
);

-- 用户积分表
CREATE TABLE user_credits (
  device_id TEXT PRIMARY KEY,
  credits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 使用日志表
CREATE TABLE usage_logs (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL,
  points INTEGER NOT NULL,
  device_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. 启动服务器

```bash
npm start
```

访问 http://localhost:3000

## 部署到 Railway

1. 将代码推送到 GitHub
2. 访问 [railway.app](https://railway.app)，连接 GitHub 仓库
3. Railway 自动检测 Node.js 项目
4. 在 Railway 设置环境变量（参考 .env.example）
5. 点击 Deploy，等待完成
6. 获得一个 `.railway.app` 域名

## 项目结构

```
美式照相馆最终版/
├── public/
│   ├── index.html      # 用户主页面
│   ├── admin.html      # 管理后台
│   ├── style.css       # 样式文件
│   └── app.js          # 前端逻辑
├── server/
│   ├── index.js        # Express 服务器入口
│   ├── db.js           # 数据库客户端
│   └── routes/         # API 路由
│       ├── generate.js      # 图片生成
│       ├── verify-code.js   # 卡密验证
│       ├── generate-codes.js # 生成卡密
│       ├── credits.js       # 积分管理
│       └── stats.js         # 统计数据
├── package.json
├── .env.example
└── README.md
```

## API 端点

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/generate` | POST | 生成图片 |
| `/api/verify-code` | POST | 验证卡密 |
| `/api/verify-code` | GET | 查询卡密状态 |
| `/api/credits` | GET | 查询积分 |
| `/api/credits` | POST | 消费积分 |
| `/api/generate-codes` | POST | 生成卡密（管理员） |
| `/api/generate-codes` | GET | 查询卡密列表（管理员） |
| `/api/stats` | GET | 获取统计数据（管理员） |

## 注意事项

- Railway 服务器主要在欧美，中国用户访问可能较慢
- 建议使用 Cloudflare CDN 加速
- 或后期迁移到国内云服务器（腾讯云/阿里云）

## 许可证

MIT
