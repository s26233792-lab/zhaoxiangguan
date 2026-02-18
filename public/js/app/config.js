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
    '1:1': { value: '1:1', label: '1:1 正方形', icon: 'square', hint: '适合头像、社交媒体' },
    '3:4': { value: '3:4', label: '3:4 竖版', icon: 'portrait', hint: '适合证件照、简历' },
    '5:7': { value: '5:7', label: '5:7 美式职业', icon: 'user', hint: '经典LinkedIn风格' },
  },

  // 拍摄角度
  angles: {
    front: { value: 'front', label: '正面对视', icon: 'eye', hint: '自信、专业的视觉形象' },
    side: { value: 'side', label: '微侧展示', icon: 'user-side', hint: '更有立体感、更自然' },
  },

  // 肤色处理
  skinTones: {
    natural: { value: 'natural', label: '自然真实', icon: 'sun', hint: '保持肤色自然质感' },
    brighten: { value: 'brighten', label: '轻微美颜', icon: 'sparkle', hint: '提亮肤色，更精神' },
  },

  // 智能换装
  outfits: {
    business_formal: { value: 'business_formal', label: '商务正装', icon: 'suit', hint: '正式西装，商务场合' },
    business_casual: { value: 'business_casual', label: '商务休闲', icon: 'shirt', hint: '衬衫领带，半正式' },
    academic: { value: 'academic', label: '美式博士', icon: 'graduation', hint: '学术帽，学术风格' },
    original: { value: 'original', label: '保持原样', icon: 'check', hint: '保持原始服装' },
  },

  // 背景色调
  backgrounds: {
    white: { value: 'white', label: '纯白背景', icon: 'circle', color: '#ffffff', hint: '经典白色，干净简洁' },
    gray: { value: 'gray', label: '中性灰', icon: 'circle', color: '#9b9a97', hint: '专业灰色，高级感' },
    blue: { value: 'blue', label: '专业蓝', icon: 'circle', color: '#0969da', hint: '商务蓝色，信任感' },
    original: { value: 'original', label: '保持原背景', icon: 'image', color: 'transparent', hint: '保留原始背景' },
  },

  // 设备ID 存储键
  deviceIdKey: 'aps_device_id',

  // 管理员登录状态
  adminAuthKey: 'aps_admin_auth',
};
