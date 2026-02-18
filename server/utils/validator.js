/**
 * 请求验证工具
 */
const { VALIDATION } = require('../config/constants');

/**
 * 验证设备ID
 * @param {string} deviceId - 设备ID
 * @returns {{ valid: boolean, error?: string }}
 */
function validateDeviceId(deviceId) {
  if (!deviceId) {
    return { valid: false, error: '设备ID不能为空' };
  }
  if (typeof deviceId !== 'string') {
    return { valid: false, error: '设备ID格式无效' };
  }
  if (deviceId.length > VALIDATION.DEVICE_ID_MAX_LENGTH) {
    return { valid: false, error: '设备ID过长' };
  }
  return { valid: true };
}

/**
 * 验证验证码
 * @param {string} code - 验证码
 * @returns {{ valid: boolean, error?: string, cleanCode?: string }}
 */
function validateCode(code) {
  if (!code) {
    return { valid: false, error: '验证码不能为空' };
  }
  if (typeof code !== 'string') {
    return { valid: false, error: '验证码格式无效' };
  }
  const cleanCode = code.trim().toUpperCase();
  if (cleanCode.length > VALIDATION.CODE_MAX_LENGTH) {
    return { valid: false, error: '验证码过长' };
  }
  if (!/^[A-Z0-9]+$/.test(cleanCode)) {
    return { valid: false, error: '验证码只能包含大写字母和数字' };
  }
  return { valid: true, cleanCode };
}

/**
 * 验证图片数据
 * @param {string} imageData - Base64图片数据
 * @returns {{ valid: boolean, error?: string }}
 */
function validateImage(imageData) {
  if (!imageData) {
    return { valid: false, error: '请上传图片' };
  }
  if (typeof imageData !== 'string') {
    return { valid: false, error: '图片格式无效' };
  }
  if (imageData.length > VALIDATION.IMAGE_MAX_SIZE) {
    return { valid: false, error: `图片过大，请上传小于${Math.floor(VALIDATION.IMAGE_MAX_SIZE / 1024 / 1024)}MB的图片` };
  }

  const match = imageData.match(/^data:image\/(\w+);base64,/);
  if (!match) {
    return { valid: false, error: '图片格式不支持' };
  }

  const format = match[1].toLowerCase();
  if (!VALIDATION.ALLOWED_IMAGE_FORMATS.includes(format)) {
    return { valid: false, error: `支持的格式: ${VALIDATION.ALLOWED_IMAGE_FORMATS.join(', ')}` };
  }

  return { valid: true };
}

/**
 * 验证风格提示词
 * @param {string} prompt - 提示词
 * @returns {{ valid: boolean, error?: string }}
 */
function validatePrompt(prompt) {
  if (!prompt || typeof prompt !== 'string') {
    return { valid: false, error: '请提供有效的风格描述' };
  }
  if (prompt.length > VALIDATION.PROMPT_MAX_LENGTH) {
    return { valid: false, error: '风格描述过长' };
  }
  return { valid: true };
}

/**
 * 验证点数
 * @param {number} points - 点数
 * @returns {{ valid: boolean, error?: string }}
 */
function validatePoints(points) {
  if (typeof points !== 'number' || isNaN(points)) {
    return { valid: false, error: '点数格式无效' };
  }
  if (points < VALIDATION.POINTS_MIN || points > VALIDATION.POINTS_MAX) {
    return { valid: false, error: `点数必须在 ${VALIDATION.POINTS_MIN}-${VALIDATION.POINTS_MAX} 之间` };
  }
  return { valid: true };
}

/**
 * 验证生成数量
 * @param {number} amount - 数量
 * @returns {{ valid: boolean, error?: string }}
 */
function validateAmount(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return { valid: false, error: '数量格式无效' };
  }
  if (amount < VALIDATION.GENERATE_AMOUNT_MIN || amount > VALIDATION.GENERATE_AMOUNT_MAX) {
    return { valid: false, error: `数量必须在 ${VALIDATION.GENERATE_AMOUNT_MIN}-${VALIDATION.GENERATE_AMOUNT_MAX} 之间` };
  }
  return { valid: true };
}

/**
 * 验证卡密长度
 * @param {number} length - 长度
 * @returns {{ valid: boolean, error?: string }}
 */
function validateCodeLength(length) {
  if (typeof length !== 'number' || isNaN(length)) {
    return { valid: false, error: '长度格式无效' };
  }
  if (length < VALIDATION.CODE_LENGTH_MIN || length > VALIDATION.CODE_LENGTH_MAX) {
    return { valid: false, error: `长度必须在 ${VALIDATION.CODE_LENGTH_MIN}-${VALIDATION.CODE_LENGTH_MAX} 之间` };
  }
  return { valid: true };
}

/**
 * 验证管理员密码
 * @param {string} password - 密码
 * @param {string} envPassword - 环境变量中的密码
 * @returns {{ valid: boolean, error?: string }}
 */
function validateAdminPassword(password, envPassword) {
  if (!envPassword) {
    return { valid: false, error: '服务器配置错误' };
  }
  if (!password || password !== envPassword) {
    return { valid: false, error: '管理员密码错误' };
  }
  return { valid: true };
}

/**
 * 综合验证图片生成请求
 * @param {Object} body - 请求体
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateGenerateRequest(body) {
  const errors = [];

  // 验证图片
  const imageResult = validateImage(body.image);
  if (!imageResult.valid) {
    errors.push(imageResult.error);
  }

  // 验证提示词
  const promptResult = validatePrompt(body.prompt);
  if (!promptResult.valid) {
    errors.push(promptResult.error);
  }

  // 验证设备ID（可选）
  if (body.deviceId) {
    const deviceResult = validateDeviceId(body.deviceId);
    if (!deviceResult.valid) {
      errors.push(deviceResult.error);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  validateDeviceId,
  validateCode,
  validateImage,
  validatePrompt,
  validatePoints,
  validateAmount,
  validateCodeLength,
  validateAdminPassword,
  validateGenerateRequest,
};
