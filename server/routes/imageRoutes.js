/**
 * 图片生成相关路由
 */
const express = require('express');
const router = express.Router();
const imageService = require('../services/imageService');
const { generateLimiter } = require('../middleware/rateLimiter');
const { validateGenerate } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { validationError } = require('../utils/response');

/**
 * @route   POST /api/generate
 * @desc    生成美式风格照片
 * @access  Public (需要积分)
 * @body    {string} image - Base64图片数据
 * @body    {string} prompt - 风格描述
 * @body    {string} deviceId - 设备ID
 */
router.post('/',
  generateLimiter,
  validateGenerate,
  asyncHandler(async (req, res) => {
    const { image, prompt, deviceId, options = {} } = req.body;

    // 构建完整提示词
    const fullPrompt = imageService.buildPrompt({
      customPrompt: prompt,
      ...options,
    });

    // 生成图片
    const imageData = await imageService.generateImage(image, fullPrompt, deviceId);

    // 返回图片
    const contentType = 'image/jpeg';
    res.set('Content-Type', contentType);
    res.send(imageData);
  })
);

module.exports = router;
