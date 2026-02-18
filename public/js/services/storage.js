/**
 * 本地存储服务
 */
class StorageService {
  /**
   * 设置项
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error('Storage set error:', err);
      return false;
    }
  }

  /**
   * 获取项
   */
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (err) {
      console.error('Storage get error:', err);
      return defaultValue;
    }
  }

  /**
   * 删除项
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (err) {
      console.error('Storage remove error:', err);
      return false;
    }
  }

  /**
   * 清空所有
   */
  clear() {
    try {
      localStorage.clear();
      return true;
    } catch (err) {
      console.error('Storage clear error:', err);
      return false;
    }
  }
}

// 导出单例
export const storage = new StorageService();
