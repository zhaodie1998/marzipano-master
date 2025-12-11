// 图片优化器 - Marzipano Pro Editor
// 提供图片压缩、缩略图生成、格式转换等功能

class ImageOptimizer {
  constructor(options = {}) {
    this.options = {
      maxWidth: options.maxWidth || 4096,
      maxHeight: options.maxHeight || 2048,
      quality: options.quality || 0.85,
      thumbnailSize: options.thumbnailSize || 200,
      ...options
    };
  }

  /**
   * 压缩图片
   * @param {File|Blob} file - 原始图片文件
   * @param {Object} options - 压缩选项
   * @returns {Promise<Blob>} 压缩后的图片
   */
  async compressImage(file, options = {}) {
    const opts = { ...this.options, ...options };
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          try {
            const compressed = this._compressImageElement(img, opts);
            resolve(compressed);
          } catch (error) {
            reject(error);
          }
        };
        
        img.onerror = () => reject(new Error('图片加载失败'));
        img.src = e.target.result;
      };
      
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * 压缩图片元素
   * @private
   */
  _compressImageElement(img, options) {
    let { width, height } = img;
    const { maxWidth, maxHeight, quality } = options;
    
    // 计算缩放比例
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }
    
    // 创建canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    
    // 使用高质量缩放
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // 绘制图片
    ctx.drawImage(img, 0, 0, width, height);
    
    // 转换为Blob
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob),
        'image/jpeg',
        quality
      );
    });
  }

  /**
   * 生成缩略图
   * @param {string} imageUrl - 图片URL或Data URL
   * @param {number} size - 缩略图尺寸
   * @returns {Promise<string>} 缩略图Data URL
   */
  async generateThumbnail(imageUrl, size = this.options.thumbnailSize) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 计算缩略图尺寸（保持宽高比）
        let width, height;
        if (img.width > img.height) {
          width = size;
          height = (img.height / img.width) * size;
        } else {
          height = size;
          width = (img.width / img.height) * size;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // 绘制缩略图
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        // 转换为Data URL
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      
      img.onerror = () => reject(new Error('缩略图生成失败'));
      img.src = imageUrl;
    });
  }

  /**
   * 批量压缩图片
   * @param {File[]} files - 图片文件数组
   * @param {Function} onProgress - 进度回调
   * @returns {Promise<Blob[]>} 压缩后的图片数组
   */
  async compressBatch(files, onProgress = null) {
    const results = [];
    const total = files.length;
    
    for (let i = 0; i < total; i++) {
      try {
        const compressed = await this.compressImage(files[i]);
        results.push(compressed);
        
        if (onProgress) {
          onProgress({
            current: i + 1,
            total,
            percent: Math.round(((i + 1) / total) * 100)
          });
        }
      } catch (error) {
        console.error(`压缩第${i + 1}张图片失败:`, error);
        results.push(null);
      }
    }
    
    return results;
  }

  /**
   * 检测图片格式
   * @param {File} file - 图片文件
   * @returns {Promise<Object>} 图片信息
   */
  async getImageInfo(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          const info = {
            width: img.width,
            height: img.height,
            aspectRatio: img.width / img.height,
            size: file.size,
            type: file.type,
            name: file.name,
            isPanorama: this._isPanoramaAspectRatio(img.width / img.height)
          };
          resolve(info);
        };
        
        img.onerror = () => reject(new Error('图片加载失败'));
        img.src = e.target.result;
      };
      
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * 判断是否为全景图宽高比
   * @private
   */
  _isPanoramaAspectRatio(ratio) {
    // 2:1 是标准全景图比例
    return ratio > 1.8 && ratio < 2.2;
  }

  /**
   * 转换图片格式
   * @param {string} imageUrl - 图片URL
   * @param {string} format - 目标格式（jpeg/png/webp）
   * @param {number} quality - 质量（0-1）
   * @returns {Promise<Blob>} 转换后的图片
   */
  async convertFormat(imageUrl, format = 'jpeg', quality = 0.9) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob(
          (blob) => resolve(blob),
          `image/${format}`,
          quality
        );
      };
      
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = imageUrl;
    });
  }

  /**
   * 计算压缩后大小（估算）
   * @param {File} file - 原始文件
   * @param {Object} options - 压缩选项
   * @returns {Promise<Object>} 估算结果
   */
  async estimateCompressedSize(file, options = {}) {
    const info = await this.getImageInfo(file);
    const opts = { ...this.options, ...options };
    
    // 计算缩放比例
    let scaleFactor = 1;
    if (info.width > opts.maxWidth || info.height > opts.maxHeight) {
      scaleFactor = Math.min(opts.maxWidth / info.width, opts.maxHeight / info.height);
    }
    
    // 估算压缩后大小（简单估算）
    const estimatedSize = Math.round(
      file.size * scaleFactor * scaleFactor * opts.quality
    );
    
    return {
      original: {
        width: info.width,
        height: info.height,
        size: file.size
      },
      compressed: {
        width: Math.round(info.width * scaleFactor),
        height: Math.round(info.height * scaleFactor),
        size: estimatedSize
      },
      reduction: Math.round((1 - estimatedSize / file.size) * 100)
    };
  }

  /**
   * 创建图片预览
   * @param {File} file - 图片文件
   * @param {HTMLElement} container - 容器元素
   * @param {Object} options - 预览选项
   */
  async createPreview(file, container, options = {}) {
    const { 
      maxWidth = 300,
      maxHeight = 200,
      showInfo = true
    } = options;
    
    try {
      const dataUrl = await this._fileToDataUrl(file);
      const thumbnail = await this.generateThumbnail(dataUrl, Math.max(maxWidth, maxHeight));
      const info = await this.getImageInfo(file);
      
      const preview = document.createElement('div');
      preview.className = 'image-preview';
      preview.innerHTML = `
        <img src="${thumbnail}" alt="${file.name}" style="max-width: ${maxWidth}px; max-height: ${maxHeight}px;">
        ${showInfo ? `
          <div class="preview-info">
            <div>${file.name}</div>
            <div>${info.width}×${info.height}</div>
            <div>${this._formatFileSize(file.size)}</div>
          </div>
        ` : ''}
      `;
      
      container.appendChild(preview);
      return preview;
    } catch (error) {
      console.error('创建预览失败:', error);
      return null;
    }
  }

  /**
   * 文件转Data URL
   * @private
   */
  _fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('读取失败'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * 格式化文件大小
   * @private
   */
  _formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// 导出全局实例
window.imageOptimizer = new ImageOptimizer({
  maxWidth: 4096,
  maxHeight: 2048,
  quality: 0.85,
  thumbnailSize: 200
});

console.log('✅ 图片优化器已加载');
