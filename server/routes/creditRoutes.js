/**
 * 积分相关路由
 */
const express = require('express');
const router = express.Router();
const creditService = require('../services/creditService');
const { generalLimiter } = require('../middleware/rateLimiter');
const { asyncHandler } = require('../middleware/errorHandler');
const { success } = require('../utils/response');

/**
 * @route   GET /api/credits
 * @desc    查询用户积分
 * @access  Public
 * @query   {string} deviceId - 设备ID
 */
router.get('/', generalLimiter, asyncHandler(async (req, res) => {
  const { deviceId } = req.query;

  const credits = await creditService.getCredits(deviceId);

  return success(res, { credits });
}));

module.exports = router;
