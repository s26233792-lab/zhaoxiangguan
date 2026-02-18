/**
 * 统一响应格式工具
 */
const { HTTP_STATUS } = require('../config/constants');

/**
 * 成功响应
 * @param {Object} res - Express response
 * @param {Object} data - 响应数据
 * @param {number} status - HTTP状态码
 */
function success(res, data = {}, status = HTTP_STATUS.OK) {
  return res.status(status).json({
    success: true,
    ...data,
  });
}

/**
 * 错误响应
 * @param {Object} res - Express response
 * @param {string} message - 错误消息
 * @param {number} status - HTTP状态码
 * @param {Object} extras - 额外数据
 */
function error(res, message, status = HTTP_STATUS.INTERNAL_ERROR, extras = {}) {
  return res.status(status).json({
    success: false,
    error: message,
    ...extras,
  });
}

/**
 * 验证错误响应
 * @param {Object} res - Express response
 * @param {string|string[]} message - 错误消息
 */
function validationError(res, message) {
  const messages = Array.isArray(message) ? message : [message];
  return error(res, messages.join(', '), HTTP_STATUS.BAD_REQUEST);
}

/**
 * 认证错误响应
 * @param {Object} res - Express response
 * @param {string} message - 错误消息
 */
function unauthorized(res, message = '未授权访问') {
  return error(res, message, HTTP_STATUS.UNAUTHORIZED);
}

/**
 * 未找到错误响应
 * @param {Object} res - Express response
 * @param {string} message - 错误消息
 */
function notFound(res, message = '请求的资源不存在') {
  return error(res, message, HTTP_STATUS.NOT_FOUND);
}

/**
 * 限流错误响应
 * @param {Object} res - Express response
 * @param {string} message - 错误消息
 */
function tooManyRequests(res, message = '请求过于频繁，请稍后再试') {
  return error(res, message, HTTP_STATUS.TOO_MANY_REQUESTS);
}

/**
 * 服务不可用错误响应
 * @param {Object} res - Express response
 * @param {string} message - 错误消息
 */
function serviceUnavailable(res, message = '服务暂时不可用') {
  return error(res, message, HTTP_STATUS.SERVICE_UNAVAILABLE);
}

/**
 * 网关超时错误响应
 * @param {Object} res - Express response
 * @param {string} message - 错误消息
 */
function gatewayTimeout(res, message = '上游服务请求超时') {
  return error(res, message, HTTP_STATUS.GATEWAY_TIMEOUT);
}

module.exports = {
  success,
  error,
  validationError,
  unauthorized,
  notFound,
  tooManyRequests,
  serviceUnavailable,
  gatewayTimeout,
};
