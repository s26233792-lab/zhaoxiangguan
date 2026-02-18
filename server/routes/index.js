/**
 * 路由聚合
 */
const express = require('express');
const router = express.Router();

// 导入各模块路由
const creditRoutes = require('./creditRoutes');
const codeRoutes = require('./codeRoutes');
const imageRoutes = require('./imageRoutes');
const adminRoutes = require('./adminRoutes');

// 挂载路由
router.use('/credits', creditRoutes);
router.use('/verify-code', codeRoutes);
router.use('/generate', imageRoutes);
router.use('/', adminRoutes); // 管理路由直接挂在 /api 下

module.exports = router;
