/**
 * 管理后台相关路由
 */
const express = require('express');
const router = express.Router();
const adminService = require('../services/adminService');
const { adminLimiter } = require('../middleware/rateLimiter');
const { requireAdminPassword } = require('../middleware/auth');
const { validateGenerateCodes, validateDeleteCode } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { success, validationError } = require('../utils/response');

/**
 * @route   GET /api/stats
 * @desc    获取统计数据
 * @access  Admin (需要密码)
 */
router.get('/stats',
  adminLimiter,
  requireAdminPassword,
  asyncHandler(async (req, res) => {
    const stats = await adminService.getStats();
    return success(res, stats);
  })
);

/**
 * @route   GET /api/codes
 * @desc    查询卡密列表
 * @access  Admin (需要密码)
 * @query   {string} adminPassword - 管理员密码
 * @query   {string} status - 状态筛选 (all/active/used)
 * @query   {number} limit - 返回数量
 * @query   {number} offset - 偏移量
 */
router.get('/codes',
  adminLimiter,
  requireAdminPassword,
  asyncHandler(async (req, res) => {
    const { status = 'all', limit = 100, offset = 0 } = req.query;

    const result = await adminService.getCodes({
      status,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    return success(res, result);
  })
);

/**
 * @route   POST /api/codes
 * @desc    生成卡密
 * @access  Admin (需要密码)
 * @body    {string} adminPassword - 管理员密码
 * @body    {number} points - 每张卡密的点数
 * @body    {number} amount - 生成数量
 * @body    {number} codeLength - 卡密长度
 */
router.post('/codes',
  adminLimiter,
  requireAdminPassword,
  validateGenerateCodes,
  asyncHandler(async (req, res) => {
    const { points, amount, codeLength } = req.body;
    const adminDeviceId = req.body.deviceId || 'admin';

    const result = await adminService.generateCodes({
      points: points || 1,
      amount: amount || 1,
      codeLength: codeLength || 8,
    }, adminDeviceId);

    return success(res, result);
  })
);

/**
 * @route   DELETE /api/codes
 * @desc    删除卡密
 * @access  Admin (需要密码)
 * @body    {string} adminPassword - 管理员密码
 * @body    {string} code - 卡密
 */
router.delete('/codes',
  adminLimiter,
  requireAdminPassword,
  validateDeleteCode,
  asyncHandler(async (req, res) => {
    const { code } = req.body;
    const adminDeviceId = req.body.deviceId || 'admin';

    const result = await adminService.deleteCode(code, adminDeviceId);

    return success(res, result);
  })
);

/**
 * @route   GET /api/logs
 * @desc    获取最近操作日志
 * @access  Admin (需要密码)
 * @query   {string} adminPassword - 管理员密码
 * @query   {number} limit - 返回数量
 */
router.get('/logs',
  adminLimiter,
  requireAdminPassword,
  asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 100;

    const logs = await adminService.getRecentLogs(limit);

    return success(res, { logs, count: logs.length });
  })
);

/**
 * @route   GET /api/users/top
 * @desc    获取积分排行榜
 * @access  Admin (需要密码)
 */
router.get('/users/top',
  adminLimiter,
  requireAdminPassword,
  asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;

    const users = await adminService.getTopUsers(limit);

    return success(res, { users, count: users.length });
  })
);

// 兼容旧路由
router.post('/generate-codes',
  adminLimiter,
  requireAdminPassword,
  validateGenerateCodes,
  asyncHandler(async (req, res) => {
    const { points, amount, codeLength } = req.body;

    const result = await adminService.generateCodes({
      points: points || 1,
      amount: amount || 1,
      codeLength: codeLength || 8,
    }, req.body.deviceId || 'admin');

    return success(res, result);
  })
);

router.get('/generate-codes',
  adminLimiter,
  requireAdminPassword,
  asyncHandler(async (req, res) => {
    const { status = 'all', limit = 100, offset = 0 } = req.query;

    const result = await adminService.getCodes({
      status,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    return success(res, result);
  })
);

router.post('/delete-code',
  adminLimiter,
  requireAdminPassword,
  validateDeleteCode,
  asyncHandler(async (req, res) => {
    const { code } = req.body;

    const result = await adminService.deleteCode(code, req.body.deviceId || 'admin');

    return success(res, result);
  })
);

module.exports = router;
