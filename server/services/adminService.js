/**
 * 管理功能业务逻辑层
 */
const codeService = require('./codeService');
const creditService = require('./creditService');
const codeRepository = require('../repositories/codeRepository');
const creditRepository = require('../repositories/creditRepository');
const usageRepository = require('../repositories/usageRepository');
const logger = require('../utils/logger');

class AdminService {
  /**
   * 获取完整统计数据
   */
  async getStats() {
    const [codeStats, userCount] = await Promise.all([
      codeService.getStats(),
      creditService.getUserCount(),
    ]);

    return {
      ...codeStats,
      totalUsers: userCount,
    };
  }

  /**
   * 生成卡密（带日志）
   * @param {Object} options - 生成选项
   * @param {string} adminDeviceId - 管理员设备ID
   */
  async generateCodes(options, adminDeviceId = 'admin') {
    const codes = await codeService.generateCodes(options);

    // 记录管理操作
    await usageRepository.logAdminAction(adminDeviceId, 'generate_codes', {
      count: codes.length,
      points: options.points || 1,
    });

    return {
      success: true,
      codes,
      count: codes.length,
      message: `已生成 ${codes.length} 张验证码`,
    };
  }

  /**
   * 获取卡密列表
   * @param {Object} options - 查询选项
   */
  async getCodes(options = {}) {
    return codeService.getCodes(options);
  }

  /**
   * 删除卡密（带日志）
   * @param {string} code - 卡密
   * @param {string} adminDeviceId - 管理员设备ID
   */
  async deleteCode(code, adminDeviceId = 'admin') {
    const result = await codeService.deleteCode(code);

    // 记录管理操作
    await usageRepository.logAdminAction(adminDeviceId, 'delete_code', { code });

    return result;
  }

  /**
   * 获取最近操作日志
   * @param {number} limit - 返回数量
   */
  async getRecentLogs(limit = 100) {
    return usageRepository.getRecentLogs(limit);
  }

  /**
   * 获取积分排行榜
   * @param {number} limit - 返回数量
   */
  async getTopUsers(limit = 10) {
    return creditService.getTopUsers(limit);
  }

  /**
   * 批量删除卡密
   * @param {Array<string>} codes - 卡密数组
   * @param {string} adminDeviceId - 管理员设备ID
   */
  async batchDeleteCodes(codes, adminDeviceId = 'admin') {
    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const code of codes) {
      try {
        await codeService.deleteCode(code);
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push({ code, error: err.message });
      }
    }

    // 记录批量操作
    await usageRepository.logAdminAction(adminDeviceId, 'batch_delete_codes', {
      total: codes.length,
      success: results.success,
      failed: results.failed,
    });

    logger.info('Batch delete codes', {
      adminDeviceId,
      total: codes.length,
      success: results.success,
      failed: results.failed,
    });

    return results;
  }

  /**
   * 导出卡密为文本格式
   * @param {Object} options - 查询选项
   */
  async exportCodes(options = {}) {
    const { codes } = await this.getCodes(options);

    // 生成文本内容
    const lines = codes.map(c => `${c.code},${c.points},${c.status}`);
    const content = [
      'Code,Points,Status',
      ...lines,
      '',
      `Total: ${codes.length}`,
    ].join('\n');

    return {
      content,
      filename: `codes_${Date.now()}.txt`,
      count: codes.length,
    };
  }
}

module.exports = new AdminService();
