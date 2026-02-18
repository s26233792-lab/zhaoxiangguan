/**
 * 全局错误处理中间件
 */
const logger = require('../utils/logger');
const { HTTP_STATUS, ERROR_TYPES } = require('../config/constants');
const { error } = require('../utils/response');

/**
 * 自定义错误类
 */
class AppError extends Error {
  constructor(message, statusCode = HTTP_STATUS.INTERNAL_ERROR, type = 'AppError') {
    super(message);
    this.statusCode = statusCode;
    this.type = type;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, HTTP_STATUS.BAD_REQUEST, ERROR_TYPES.VALIDATION_ERROR);
  }
}

class AuthenticationError extends AppError {
  constructor(message = '认证失败') {
    super(message, HTTP_STATUS.UNAUTHORIZED, ERROR_TYPES.AUTH_ERROR);
  }
}

class NotFoundError extends AppError {
  constructor(message = '资源不存在') {
    super(message, HTTP_STATUS.NOT_FOUND, ERROR_TYPES.NOT_FOUND_ERROR);
  }
}

class ConflictError extends AppError {
  constructor(message = '资源冲突') {
    super(message, HTTP_STATUS.BAD_REQUEST, ERROR_TYPES.CONFLICT_ERROR);
  }
}

class APIError extends AppError {
  constructor(message = '外部服务错误') {
    super(message, HTTP_STATUS.SERVICE_UNAVAILABLE, ERROR_TYPES.API_ERROR);
  }
}

class DatabaseError extends AppError {
  constructor(message = '数据库错误') {
    super(message, HTTP_STATUS.INTERNAL_ERROR, ERROR_TYPES.DATABASE_ERROR);
  }
}

/**
 * 错误处理中间件
 * 注意：必须有4个参数 (err, req, res, next)
 */
function errorHandler(err, req, res, next) {
  // 记录错误
  logger.error(err, req);

  // 请求体过大
  if (err.type === 'entity.too.large') {
    return error(res, '请求体过大', HTTP_STATUS.BAD_REQUEST);
  }

  // JSON 解析错误
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return error(res, '请求数据格式错误', HTTP_STATUS.BAD_REQUEST);
  }

  // 应用自定义错误
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      type: err.type,
    });
  }

  // 数据库唯一约束冲突
  if (err.code === '23505') {
    return error(res, '数据已存在', HTTP_STATUS.BAD_REQUEST);
  }

  // 数据库外键约束冲突
  if (err.code === '23503') {
    return error(res, '关联数据不存在', HTTP_STATUS.BAD_REQUEST);
  }

  // 默认服务器错误
  return error(
    res,
    process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message,
    HTTP_STATUS.INTERNAL_ERROR
  );
}

/**
 * 404 处理中间件
 */
function notFoundHandler(req, res) {
  return error(res, '请求的资源不存在', HTTP_STATUS.NOT_FOUND);
}

/**
 * 异步错误包装器
 * 用于在异步路由中捕获错误
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  ConflictError,
  APIError,
  DatabaseError,
};
