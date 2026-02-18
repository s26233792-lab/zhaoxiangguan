/**
 * 认证中间件
 */
const config = require('../config/env');
const { unauthorized } = require('../utils/response');
const logger = require('../utils/logger');
const { timingSafeEqual } = require('../utils/crypto');

/**
 * 管理员密码验证中间件
 * 支持从请求体或查询参数获取密码
 */
function requireAdminPassword(req, res, next) {
  // 支持从请求体或查询参数获取密码
  const adminPassword = req.body?.adminPassword || req.query?.adminPassword;
  const envPassword = config.ADMIN_PASSWORD;

  if (!envPassword) {
    logger.error('ADMIN_PASSWORD not configured');
    return unauthorized(res, '服务器配置错误');
  }

  // 使用常量时间比较防止时序攻击
  if (!adminPassword || adminPassword.length !== envPassword.length) {
    logger.warn('Admin authentication failed (length mismatch)', {
      ip: req.ip,
      url: req.url,
    });
    return unauthorized(res);
  }

  if (!timingSafeEqual(adminPassword, envPassword)) {
    logger.warn('Admin authentication failed (password mismatch)', {
      ip: req.ip,
      url: req.url,
    });
    return unauthorized(res);
  }

  next();
}

/**
 * 可选的管理员密码验证（用于GET请求）
 */
function optionalAdminAuth(req, res, next) {
  const adminPassword = req.body?.adminPassword || req.query?.adminPassword;
  const envPassword = config.ADMIN_PASSWORD;

  if (!envPassword) {
    return next();
  }

  if (adminPassword && adminPassword === envPassword) {
    req.isAdmin = true;
  } else {
    req.isAdmin = false;
  }

  next();
}

module.exports = {
  requireAdminPassword,
  optionalAdminAuth,
};
