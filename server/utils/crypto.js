/**
 * 加密与随机数工具
 */
const crypto = require('crypto');

/**
 * 生成加密安全的随机卡密
 * @param {number} length - 卡密长度
 * @returns {string} 随机卡密
 */
function generateSecureCode(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const randomBytes = crypto.randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[randomBytes[i] % chars.length];
  }
  return code;
}

/**
 * 生成设备ID（如果客户端未提供）
 * @returns {string} 设备ID
 */
function generateDeviceId() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * 生成UUID v4
 * @returns {string} UUID
 */
function generateUUID() {
  return crypto.randomUUID();
}

/**
 * SHA256 哈希
 * @param {string} data - 待哈希数据
 * @returns {string} 哈希值
 */
function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * HMAC-SHA256 签名
 * @param {string} data - 待签名数据
 * @param {string} secret - 密钥
 * @returns {string} 签名
 */
function hmacSha256(data, secret) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * 生成随机字符串
 * @param {number} length - 长度
 * @param {string} charset - 字符集
 * @returns {string} 随机字符串
 */
function randomString(length, charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') {
  const chars = charset;
  const randomBytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  return result;
}

/**
 * 验证哈希（常量时间比较，防时序攻击）
 * @param {string} a - 字符串a
 * @param {string} b - 字符串b
 * @returns {boolean} 是否匹配
 */
function timingSafeEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

module.exports = {
  generateSecureCode,
  generateDeviceId,
  generateUUID,
  sha256,
  hmacSha256,
  randomString,
  timingSafeEqual,
};
