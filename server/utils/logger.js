/**
 * Winston 日志系统
 */
const winston = require('winston');
const config = require('../config/env');

// 自定义日志格式
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// 控制台格式（开发环境）
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// 创建日志目录
const fs = require('fs');
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 创建 Winston logger
const logger = winston.createLogger({
  level: config.LOG_LEVEL || 'info',
  format: customFormat,
  transports: [
    // 错误日志文件
    new winston.transports.File({
      filename: `${logDir}/error.log`,
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // 综合日志文件
    new winston.transports.File({
      filename: `${logDir}/combined.log`,
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
  // 异常处理
  exceptionHandlers: [
    new winston.transports.File({ filename: `${logDir}/exceptions.log` }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: `${logDir}/rejections.log` }),
  ],
});

// 开发环境添加控制台输出
if (config.isDevelopment()) {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
  }));
}

// 生产环境也添加控制台（简化格式）
if (config.isProduction()) {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }));
}

// 为不同模块创建子logger
module.exports = logger;
module.exports.createModuleLogger = (moduleName) => {
  return logger.child({ module: moduleName });
};

// 快捷方法
module.exports.request = (req) => {
  logger.info('HTTP Request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
};

module.exports.error = (err, req = null) => {
  logger.error('Error', {
    message: err.message,
    stack: err.stack,
    ...(req && {
      url: req.url,
      method: req.method,
      ip: req.ip,
    }),
  });
};
