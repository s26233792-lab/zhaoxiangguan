/**
 * 应用常量配置
 */

// HTTP 状态码
module.exports.HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
};

// 验证码状态
module.exports.CODE_STATUS = {
  ACTIVE: 'active',
  USED: 'used',
};

// 验证限制
module.exports.VALIDATION = {
  DEVICE_ID_MAX_LENGTH: 100,
  CODE_MAX_LENGTH: 20,
  PROMPT_MAX_LENGTH: 500,
  IMAGE_MAX_SIZE: 4 * 1024 * 1024, // 4MB
  ALLOWED_IMAGE_FORMATS: ['jpeg', 'jpg', 'png', 'webp'],
  POINTS_MIN: 1,
  POINTS_MAX: 1000,
  GENERATE_AMOUNT_MIN: 1,
  GENERATE_AMOUNT_MAX: 1000,
  CODE_LENGTH_MIN: 4,
  CODE_LENGTH_MAX: 20,
  CODE_UNIQUE_ATTEMPTS: 100,
};

// 默认值
module.exports.DEFAULTS = {
  POINTS: 1,
  GENERATE_AMOUNT: 1,
  CODE_LENGTH: 8,
  LIST_LIMIT: 100,
  LIST_MAX_LIMIT: 1000,
};

// 日志操作类型
module.exports.LOG_ACTIONS = {
  REDEEM_CODE: 'redeem_code',
  GENERATE_IMAGE: 'generate_image',
  GENERATE_CODES: 'generate_codes',
  DELETE_CODE: 'delete_code',
};

// 错误类型
module.exports.ERROR_TYPES = {
  VALIDATION_ERROR: 'ValidationError',
  AUTH_ERROR: 'AuthenticationError',
  NOT_FOUND_ERROR: 'NotFoundError',
  CONFLICT_ERROR: 'ConflictError',
  API_ERROR: 'APIError',
  DATABASE_ERROR: 'DatabaseError',
};

// 图片尺寸选项
module.exports.IMAGE_ASPECT_RATIOS = {
  SQUARE: { value: '1:1', label: '1:1 正方形' },
  PORTRAIT_34: { value: '3:4', label: '3:4 竖版' },
  PORTRAIT_57: { value: '5:7', label: '5:7 美式职业' },
};

// 风格选项
module.exports.STYLE_OPTIONS = {
  ANGLE: {
    FRONT: 'front',
    SIDE: 'side',
  },
  SKIN_TONE: {
    NATURAL: 'natural',
    BRIGHTEN: 'brighten',
  },
  OUTFIT: {
    BUSINESS_FORMAL: 'business_formal',
    BUSINESS_CASUAL: 'business_casual',
    ACADEMIC: 'academic',
    ORIGINAL: 'original',
  },
  BACKGROUND: {
    WHITE: 'white',
    GRAY: 'gray',
    BLUE: 'blue',
    ORIGINAL: 'original',
  },
};
