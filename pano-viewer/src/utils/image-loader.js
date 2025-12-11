/**
 * 图片加载优化工具
 * 支持渐进式加载、缓存管理、缩略图生成
 */

import performanceMonitor from './performance-monitor.js';

class ImageLoader {
  constructor() {
    this.cache = new Map();
    this.thumbnailCache = new Map();
    this.loading = new Map();
    this.maxCacheSize = 50;
    this.defaultThumbnailSize = 256;
  }

  /**
   * 渐进式加载图片
   * 先生成并返回缩略图，再加载完整图片
   * @param {string} imageData - 图片数据（URL 或 base64）
   * @param {Object} options - 加载选项
   * @returns {Promise<ImageResult>}
   */
  async loadProgressive(imageData, options = {}) {
    const {
      onProgress,
      onThumbnailReady,
      thumbnailSize = this.defaultThumbnailSize
    } = options;

    const cacheKey = this._getCacheKey(imageData);
    
    // 检查完整缓存
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (onThumbnailReady) onThumbnailReady(cached.thumbnail);
      if (onProgress) onProgress(100);
      return cached;
    }

    // 检查是否正在加载
    if (this.loading.has(cacheKey)) {
      return this.loading.get(cacheKey);
    }

    // 创建加载 Promise
    const loadPromise = this._loadProgressiveInternal(
      imageData, 
      { onProgress, onThumbnailReady, thumbnailSize }
    );
    this.loading.set(cacheKey, loadPromise);

    try {
      const result = await loadPromise;
      this._addToCache(cacheKey, result);
      
      // Record load time in performance monitor
      performanceMonitor.recordImageLoadTime(cacheKey, result.loadTime);
      
      return result;
    } finally {
      this.loading.delete(cacheKey);
    }
  }

  /**
   * 内部渐进式加载实现
   */
  async _loadProgressiveInternal(imageData, options) {
    const { onProgress, onThumbnailReady, thumbnailSize } = options;
    const startTime = performance.now();

    // 步骤1: 加载原始图片
    if (onProgress) onProgress(0);
    
    const img = await this._loadImage(imageData, (percent) => {
      // 加载进度占 0-80%
      if (onProgress) onProgress(percent * 0.8);
    });

    // 步骤2: 生成缩略图
    if (onProgress) onProgress(80);
    const thumbnail = await this.generateThumbnail(img, thumbnailSize);
    
    // 通知缩略图已就绪
    if (onThumbnailReady) onThumbnailReady(thumbnail);
    
    if (onProgress) onProgress(90);

    // 步骤3: 准备完整图片数据
    const fullImage = imageData;
    
    if (onProgress) onProgress(100);

    const loadTime = performance.now() - startTime;

    return {
      thumbnail,
      fullImage,
      width: img.width,
      height: img.height,
      loadTime
    };
  }

  /**
   * 加载图片元素
   */
  async _loadImage(src, onProgress) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        if (onProgress) onProgress(100);
        resolve(img);
      };
      
      img.onerror = () => {
        reject(new Error('图片加载失败'));
      };

      // 如果是 URL，尝试使用 XHR 获取进度
      if (src.startsWith('http') || src.startsWith('blob:')) {
        this._loadWithXHR(src, onProgress)
          .then(blobUrl => {
            img.src = blobUrl;
          })
          .catch(() => {
            // 回退到直接加载
            img.src = src;
          });
      } else {
        // base64 或 data URL 直接加载
        if (onProgress) onProgress(50);
        img.src = src;
      }
    });
  }

  /**
   * 使用 XHR 加载以获取进度
   */
  async _loadWithXHR(url, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'blob';

      xhr.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          const percent = (e.loaded / e.total) * 100;
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const blobUrl = URL.createObjectURL(xhr.response);
          resolve(blobUrl);
        } else {
          reject(new Error(`加载失败: ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('网络错误'));
      xhr.send();
    });
  }

  /**
   * 生成缩略图
   * @param {HTMLImageElement|string} source - 图片元素或图片数据
   * @param {number} size - 缩略图最大尺寸
   * @returns {Promise<string>} 缩略图 data URL
   */
  async generateThumbnail(source, size = this.defaultThumbnailSize) {
    let img = source;
    
    // 如果是字符串，先加载图片
    if (typeof source === 'string') {
      img = await this._loadImage(source);
    }

    // 计算缩略图尺寸，保持宽高比
    const aspectRatio = img.width / img.height;
    let thumbWidth, thumbHeight;
    
    if (aspectRatio > 1) {
      thumbWidth = Math.min(size, img.width);
      thumbHeight = thumbWidth / aspectRatio;
    } else {
      thumbHeight = Math.min(size, img.height);
      thumbWidth = thumbHeight * aspectRatio;
    }

    // 使用 Canvas 生成缩略图
    const canvas = document.createElement('canvas');
    canvas.width = thumbWidth;
    canvas.height = thumbHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, thumbWidth, thumbHeight);
    
    return canvas.toDataURL('image/jpeg', 0.7);
  }

  /**
   * 获取缓存键
   */
  _getCacheKey(imageData) {
    if (imageData.length > 100) {
      // 对于长字符串（如 base64），使用哈希
      return 'img_' + this._simpleHash(imageData);
    }
    return imageData;
  }

  /**
   * 简单哈希函数
   */
  _simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 添加到缓存
   */
  _addToCache(key, value) {
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear();
    this.thumbnailCache.clear();
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      thumbnailCount: this.thumbnailCache.size
    };
  }

  /**
   * 预加载图片列表
   */
  async preload(urls, options = {}) {
    return Promise.all(urls.map(url => this.loadProgressive(url, options)));
  }

  /**
   * 检查是否已缓存
   */
  isCached(imageData) {
    const key = this._getCacheKey(imageData);
    return this.cache.has(key);
  }
}

// 导出单例
const imageLoader = new ImageLoader();
export default imageLoader;

// 导出类以便测试
export { ImageLoader };
