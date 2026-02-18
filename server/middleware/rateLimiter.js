/**
 * 限流中间件
 */
const rateLimit = require('express-rate-limit');
const config = require('../config/env');
const { tooManyRequests } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * 通用限流器
 */
const generalLimiter = rateLimit({
  windowMs: config.RATE_LIMIT.WINDOW_MS,
  max: config.RATE_LIMIT.GENERAL_MAX,
  message: { error: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      url: req.url,
    });
    return tooManyRequests(res);
  },
});

/**
 * 图片生成限流器（更严格）
 */
const generateLimiter = rateLimit({
  windowMs: config.RATE_LIMIT.GENERATE_WINDOW_MS,
  max: config.RATE_LIMIT.GENERATE_MAX,
  message: { error: '生成图片过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Generate rate limit exceeded', {
      ip: req.ip,
      deviceId: req.body?.deviceId,
    });
    return tooManyRequests(res, '生成图片过于频繁，请稍后再试');
  },
});

/**
 * 管理后台限流器
 */
const adminLimiter = rateLimit({
  windowMs: config.RATE_LIMIT.WINDOW_MS,
  max: config.RATE_LIMIT.ADMIN_MAX,
  message: { error: '管理后台请求过于频繁' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Admin rate limit exceeded', {
      ip: req.ip,
      url: req.url,
    });
    return tooManyRequests(res, '管理后台请求过于频繁');
  },
});

/**
 * 为特定IP创建限流器（用于防止暴力破解）
 */
function createIpLimiter(windowMs = 15 * 60 * 1000, maxAttempts = 5) {
  return rateLimit({
    windowMs,
    max: maxAttempts,
    message: { error: '尝试次数过多，请稍后再试' },
    skipSuccessfulRequests: true, // 成功的请求不计入
    handler: (req, res) => {
      logger.warn('IP rate limit exceeded', {
        ip: req.ip,
        url: req.url,
      });
      return tooManyRequests(res);
    },
  });
}

module.exports = {
  generalLimiter,
  generateLimiter,
  adminLimiter,
  createIpLimiter,
};
