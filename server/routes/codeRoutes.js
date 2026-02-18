/**
 * 卡密相关路由
 */
const express = require('express');
const router = express.Router();
const codeService = require('../services/codeService');
const { generalLimiter } = require('../middleware/rateLimiter');
const { validateRedeemCode, validateQueryCode } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { success } = require('../utils/response');

/**
 * @route   POST /api/verify-code
 * @desc    验证卡密并发放积分
 * @access  Public
 * @body    {string} code - 卡密
 * @body    {string} deviceId - 设备ID
 */
router.post('/',
  generalLimiter,
  validateRedeemCode,
  asyncHandler(async (req, res) => {
    const { code, deviceId } = req.body;
    const cleanCode = code.trim().toUpperCase();

    const result = await codeService.redeemCode(cleanCode, deviceId);

    return success(res, result);
  })
);

/**
 * @route   GET /api/verify-code
 * @desc    查询卡密状态
 * @access  Public
 * @query   {string} code - 卡密
 */
router.get('/',
  generalLimiter,
  validateQueryCode,
  asyncHandler(async (req, res) => {
    const code = req.query.code.trim().toUpperCase();

    const result = await codeService.getCodeStatus(code);

    return success(res, result);
  })
);

module.exports = router;
