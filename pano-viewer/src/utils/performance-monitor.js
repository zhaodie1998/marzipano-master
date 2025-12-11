/**
 * 性能监控工具
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      fps: 0,
      memory: 0,
      loadTime: 0,
      renderTime: 0
    };
    this.fpsHistory = [];
    this.imageLoadTimes = []; // Track individual image load times
    this.maxHistorySize = 60;
    this.maxImageLoadHistory = 20; // Keep last 20 image load times
    this.isMonitoring = false;
  }

  /**
   * 开始监控
   */
  start() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;

    // FPS 监控
    this._startFPSMonitor();

    // 内存监控
    if (performance.memory) {
      this._startMemoryMonitor();
    }
  }

  /**
   * 停止监控
   */
  stop() {
    this.isMonitoring = false;
    if (this.fpsInterval) {
      cancelAnimationFrame(this.fpsInterval);
    }
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
    }
  }

  /**
   * FPS 监控
   */
  _startFPSMonitor() {
    let lastTime = performance.now();
    let frames = 0;

    const measureFPS = () => {
      if (!this.isMonitoring) return;

      frames++;
      const currentTime = performance.now();
      const delta = currentTime - lastTime;

      if (delta >= 1000) {
        this.metrics.fps = Math.round((frames * 1000) / delta);
        this.fpsHistory.push(this.metrics.fps);

        if (this.fpsHistory.length > this.maxHistorySize) {
          this.fpsHistory.shift();
        }

        frames = 0;
        lastTime = currentTime;
      }

      this.fpsInterval = requestAnimationFrame(measureFPS);
    };

    measureFPS();
  }

  /**
   * 内存监控
   */
  _startMemoryMonitor() {
    this.memoryInterval = setInterval(() => {
      if (!this.isMonitoring) return;

      const memory = performance.memory;
      this.metrics.memory = {
        used: Math.round(memory.usedJSHeapSize / 1048576), // MB
        total: Math.round(memory.totalJSHeapSize / 1048576),
        limit: Math.round(memory.jsHeapSizeLimit / 1048576)
      };
    }, 1000);
  }

  /**
   * 测量加载时间
   */
  measureLoadTime(name, callback) {
    const startTime = performance.now();
    
    const result = callback();
    
    if (result instanceof Promise) {
      return result.then(value => {
        const endTime = performance.now();
        this.metrics.loadTime = endTime - startTime;
        console.log(`${name} 加载时间: ${this.metrics.loadTime.toFixed(2)}ms`);
        return value;
      });
    } else {
      const endTime = performance.now();
      this.metrics.loadTime = endTime - startTime;
      console.log(`${name} 加载时间: ${this.metrics.loadTime.toFixed(2)}ms`);
      return result;
    }
  }

  /**
   * 记录图片加载时间
   * @param {string} imageId - 图片标识符
   * @param {number} loadTime - 加载时间（毫秒）
   */
  recordImageLoadTime(imageId, loadTime) {
    const record = {
      imageId,
      loadTime,
      timestamp: Date.now()
    };

    this.imageLoadTimes.push(record);

    // 保持历史记录在限制内
    if (this.imageLoadTimes.length > this.maxImageLoadHistory) {
      this.imageLoadTimes.shift();
    }

    // 更新最新的加载时间指标
    this.metrics.loadTime = loadTime;
  }

  /**
   * 获取图片加载统计
   */
  getImageLoadStats() {
    if (this.imageLoadTimes.length === 0) {
      return {
        count: 0,
        averageLoadTime: 0,
        minLoadTime: 0,
        maxLoadTime: 0,
        totalLoadTime: 0
      };
    }

    const loadTimes = this.imageLoadTimes.map(record => record.loadTime);
    const totalLoadTime = loadTimes.reduce((sum, time) => sum + time, 0);

    return {
      count: this.imageLoadTimes.length,
      averageLoadTime: totalLoadTime / this.imageLoadTimes.length,
      minLoadTime: Math.min(...loadTimes),
      maxLoadTime: Math.max(...loadTimes),
      totalLoadTime,
      recentLoads: this.imageLoadTimes.slice(-5) // Last 5 loads
    };
  }

  /**
   * 获取性能报告
   */
  getReport() {
    const avgFPS = this.fpsHistory.length > 0
      ? Math.round(this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length)
      : 0;

    const imageLoadStats = this.getImageLoadStats();

    return {
      currentFPS: this.metrics.fps,
      averageFPS: avgFPS,
      minFPS: Math.min(...this.fpsHistory),
      maxFPS: Math.max(...this.fpsHistory),
      memory: this.metrics.memory,
      loadTime: this.metrics.loadTime,
      renderTime: this.metrics.renderTime,
      imageLoads: imageLoadStats
    };
  }

  /**
   * 显示性能面板
   */
  showPanel() {
    if (this.panel) return;

    this.panel = document.createElement('div');
    this.panel.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: #0f0;
      padding: 10px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10000;
      border-radius: 4px;
      min-width: 200px;
    `;

    document.body.appendChild(this.panel);

    const updatePanel = () => {
      if (!this.panel) return;

      const report = this.getReport();
      const warnFps = report.currentFPS && report.currentFPS < 30;
      const memRatio = report.memory ? (report.memory.used / report.memory.limit) : 0;
      const warnMem = report.memory && memRatio >= 0.8;
      const warnings = (warnFps || warnMem) ? `<div style="margin-top: 6px; color: #f59e0b;">${warnFps ? 'FPS 低于 30' : ''}${warnFps && warnMem ? ' · ' : ''}${warnMem ? '内存接近上限' : ''}</div>` : '';
      this.panel.innerHTML = `
        <div>FPS: ${report.currentFPS} (avg: ${report.averageFPS})</div>
        ${report.memory ? `
          <div>Memory: ${report.memory.used}MB / ${report.memory.total}MB</div>
        ` : ''}
        <div>Load: ${report.loadTime.toFixed(2)}ms</div>
        ${report.imageLoads.count > 0 ? `
          <div style="margin-top: 5px; border-top: 1px solid #0f0; padding-top: 5px;">
            <div>Images: ${report.imageLoads.count}</div>
            <div>Avg: ${report.imageLoads.averageLoadTime.toFixed(2)}ms</div>
            <div>Min/Max: ${report.imageLoads.minLoadTime.toFixed(0)}/${report.imageLoads.maxLoadTime.toFixed(0)}ms</div>
          </div>
        ` : ''}
        ${warnings}
      `;

      requestAnimationFrame(updatePanel);
    };

    updatePanel();
  }

  /**
   * 隐藏性能面板
   */
  hidePanel() {
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
    }
  }
}

export default new PerformanceMonitor();
