/**
 * 请求验证中间件
 */
const { validateGenerateRequest } = require('../utils/validator');
const { validationError } = require('../utils/response');

/**
 * 验证图片生成请求
 */
function validateGenerate(req, res, next) {
  const result = validateGenerateRequest(req.body);

  if (!result.valid) {
    return validationError(res, result.errors);
  }

  next();
}

/**
 * 验证验证码兑换请求
 */
function validateRedeemCode(req, res, next) {
  const { code, deviceId } = req.body;

  const errors = [];

  if (!code) {
    errors.push('请输入验证码');
  } else if (typeof code !== 'string') {
    errors.push('验证码格式无效');
  }

  if (!deviceId) {
    errors.push('设备ID不能为空');
  } else if (typeof deviceId !== 'string' || deviceId.length > 100) {
    errors.push('设备ID格式无效');
  }

  if (errors.length > 0) {
    return validationError(res, errors);
  }

  next();
}

/**
 * 验证查询卡密请求
 */
function validateQueryCode(req, res, next) {
  const code = req.query.code;

  if (!code) {
    return validationError(res, '请提供验证码');
  }

  if (typeof code !== 'string' || code.length > 20) {
    return validationError(res, '验证码格式无效');
  }

  next();
}

/**
 * 验证生成卡密请求
 */
function validateGenerateCodes(req, res, next) {
  const { points, amount, codeLength } = req.body;

  const errors = [];

  if (points !== undefined) {
    if (typeof points !== 'number' || points < 1 || points > 1000) {
      errors.push('点数必须在 1-1000 之间');
    }
  }

  if (amount !== undefined) {
    if (typeof amount !== 'number' || amount < 1 || amount > 1000) {
      errors.push('生成数量必须在 1-1000 之间');
    }
  }

  if (codeLength !== undefined) {
    if (typeof codeLength !== 'number' || codeLength < 4 || codeLength > 20) {
      errors.push('卡密长度必须在 4-20 之间');
    }
  }

  if (errors.length > 0) {
    return validationError(res, errors);
  }

  next();
}

/**
 * 验证删除卡密请求
 */
function validateDeleteCode(req, res, next) {
  const { code } = req.body;

  if (!code) {
    return validationError(res, '请提供卡密');
  }

  if (typeof code !== 'string' || code.length > 20) {
    return validationError(res, '卡密格式无效');
  }

  next();
}

module.exports = {
  validateGenerate,
  validateRedeemCode,
  validateQueryCode,
  validateGenerateCodes,
  validateDeleteCode,
};
