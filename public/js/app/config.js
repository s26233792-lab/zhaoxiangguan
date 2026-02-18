/**
 * 应用配置
 */
export const config = {
  // API 基础路径
  apiBase: '/api',

  // API 端点
  endpoints: {
    credits: '/api/credits',
    verifyCode: '/api/verify-code',
    generate: '/api/generate',
    stats: '/api/stats',
    codes: '/api/codes',
    generateCodes: '/api/generate-codes',
    deleteCode: '/api/delete-code',
  },

  // 请求超时（毫秒）
  requestTimeout: 60000,

  // 图片尺寸选项
  aspectRatios: {
    '1:1': { value: '1:1', label: '1:1 正方形' },
    '3:4': { value: '3:4', label: '3:4 竖版' },
    '5:7': { value: '5:7', label: '5:7 美式职业' },
  },

  // 拍摄角度
  angles: {
    front: { value: 'front', label: '正面对视' },
    side: { value: 'side', label: '微侧展示' },
  },

  // 肤色处理
  skinTones: {
    natural: { value: 'natural', label: '自然真实' },
    brighten: { value: 'brighten', label: '轻微美颜' },
  },

  // 智能换装
  outfits: {
    business_formal: { value: 'business_formal', label: '商务正装' },
    business_casual: { value: 'business_casual', label: '商务休闲' },
    academic: { value: 'academic', label: '美式博士' },
    original: { value: 'original', label: '保持原样' },
  },

  // 背景色调
  backgrounds: {
    white: { value: 'white', label: '纯白背景' },
    gray: { value: 'gray', label: '中性灰' },
    blue: { value: 'blue', label: '专业蓝' },
    original: { value: 'original', label: '保持原背景' },
  },

  // 设备ID 存储键
  deviceIdKey: 'aps_device_id',

  // 管理员登录状态
  adminAuthKey: 'aps_admin_auth',
};
