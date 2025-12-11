// 工具函数库 - Marzipano Pro Editor

/**
 * 防抖函数 - 延迟执行，多次触发只执行最后一次
 * @param {Function} func - 需要防抖的函数
 * @param {number} wait - 延迟时间（毫秒）
 * @param {boolean} immediate - 是否立即执行
 * @returns {Function} 防抖后的函数
 */
function debounce(func, wait = 300, immediate = false) {
  let timeout;
  return function executedFunction(...args) {
    const context = this;
    const later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

/**
 * 节流函数 - 限制执行频率
 * @param {Function} func - 需要节流的函数
 * @param {number} limit - 时间间隔（毫秒）
 * @returns {Function} 节流后的函数
 */
function throttle(func, limit = 300) {
  let inThrottle;
  return function executedFunction(...args) {
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * 图片懒加载
 * @param {HTMLImageElement} img - 图片元素
 * @param {string} src - 真实图片地址
 * @param {string} placeholder - 占位图地址
 */
function lazyLoadImage(img, src, placeholder = '') {
  if (!img) return;
  
  // 设置占位图
  if (placeholder) {
    img.src = placeholder;
  }
  
  // 使用 Intersection Observer
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const image = entry.target;
          image.src = src;
          image.classList.add('loaded');
          observer.unobserve(image);
        }
      });
    }, {
      rootMargin: '50px' // 提前50px开始加载
    });
    
    observer.observe(img);
  } else {
    // 降级方案：直接加载
    img.src = src;
  }
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @param {number} decimals - 小数位数
 * @returns {string} 格式化后的大小
 */
function formatFileSize(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * 深拷贝对象
 * @param {*} obj - 需要拷贝的对象
 * @returns {*} 拷贝后的新对象
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (obj instanceof Object) {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
}

/**
 * 生成唯一ID
 * @param {string} prefix - 前缀
 * @returns {string} 唯一ID
 */
function generateUniqueId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 下载文件
 * @param {string} data - 文件数据（Data URL或Blob URL）
 * @param {string} filename - 文件名
 */
function downloadFile(data, filename) {
  const link = document.createElement('a');
  link.href = data;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * 复制文本到剪贴板
 * @param {string} text - 需要复制的文本
 * @returns {Promise<boolean>} 是否成功
 */
async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // 降级方案
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    }
  } catch (err) {
    console.error('复制失败:', err);
    return false;
  }
}

/**
 * 获取查询参数
 * @param {string} name - 参数名
 * @returns {string|null} 参数值
 */
function getQueryParam(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

/**
 * 设置查询参数（不刷新页面）
 * @param {string} name - 参数名
 * @param {string} value - 参数值
 */
function setQueryParam(name, value) {
  const url = new URL(window.location);
  url.searchParams.set(name, value);
  window.history.pushState({}, '', url);
}

/**
 * 本地存储封装
 */
const storage = {
  /**
   * 设置项
   * @param {string} key - 键
   * @param {*} value - 值
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error('存储失败:', err);
      return false;
    }
  },
  
  /**
   * 获取项
   * @param {string} key - 键
   * @param {*} defaultValue - 默认值
   * @returns {*} 值
   */
  get(key, defaultValue = null) {
    try {
      const value = localStorage.getItem(key);
      return value !== null ? JSON.parse(value) : defaultValue;
    } catch (err) {
      console.error('读取失败:', err);
      return defaultValue;
    }
  },
  
  /**
   * 删除项
   * @param {string} key - 键
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (err) {
      console.error('删除失败:', err);
      return false;
    }
  },
  
  /**
   * 清空所有
   */
  clear() {
    try {
      localStorage.clear();
      return true;
    } catch (err) {
      console.error('清空失败:', err);
      return false;
    }
  }
};

/**
 * 性能监控
 */
const performanceMonitor = {
  /**
   * 测量执行时间
   * @param {string} label - 标签
   * @param {Function} fn - 需要测量的函数
   * @returns {*} 函数返回值
   */
  measure(label, fn) {
    const start = Date.now();
    const result = fn();
    const duration = Date.now() - start;
    console.log(`[性能] ${label}: ${duration}ms`);
    return result;
  },
  
  /**
   * 获取页面性能指标
   * @returns {Object} 性能指标
   */
  getMetrics() {
    if (!window.performance || !window.performance.timing) {
      return null;
    }
    
    const timing = window.performance.timing;
    const navigationStart = timing.navigationStart;
    
    return {
      // DNS查询耗时
      dns: timing.domainLookupEnd - timing.domainLookupStart,
      // TCP连接耗时
      tcp: timing.connectEnd - timing.connectStart,
      // 请求耗时
      request: timing.responseEnd - timing.requestStart,
      // 响应耗时
      response: timing.responseEnd - timing.responseStart,
      // DOM解析耗时
      dom: timing.domComplete - timing.domLoading,
      // 页面加载总耗时
      load: timing.loadEventEnd - navigationStart,
      // 首次渲染时间
      fcp: timing.responseEnd - navigationStart,
      // 可交互时间
      tti: timing.domInteractive - navigationStart
    };
  },
  
  /**
   * 打印性能指标
   */
  logMetrics() {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const metrics = this.getMetrics();
        if (metrics) {
          console.table(metrics);
        }
      }, 0);
    });
  }
};

/**
 * 错误处理
 */
const errorHandler = {
  /**
   * 捕获全局错误
   */
  init() {
    window.addEventListener('error', (event) => {
      console.error('全局错误:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      console.error('未处理的Promise拒绝:', event.reason);
    });
  },
  
  /**
   * 包装函数，添加错误处理
   * @param {Function} fn - 原函数
   * @param {Function} onError - 错误回调
   * @returns {Function} 包装后的函数
   */
  wrap(fn, onError = null) {
    return function(...args) {
      try {
        return fn.apply(this, args);
      } catch (err) {
        console.error('函数执行错误:', err);
        if (onError) onError(err);
      }
    };
  }
};

// 导出工具函数
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    debounce,
    throttle,
    lazyLoadImage,
    formatFileSize,
    deepClone,
    generateUniqueId,
    downloadFile,
    copyToClipboard,
    getQueryParam,
    setQueryParam,
    storage,
    performanceMonitor,
    errorHandler
  };
}
