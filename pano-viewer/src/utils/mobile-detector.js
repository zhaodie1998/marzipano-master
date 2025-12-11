/**
 * 移动端检测和适配工具
 */

class MobileDetector {
  constructor() {
    this.isMobile = this._detectMobile();
    this.isTablet = this._detectTablet();
    this.isIOS = this._detectIOS();
    this.isAndroid = this._detectAndroid();
    this.orientation = this._getOrientation();
    
    this._initOrientationListener();
  }

  /**
   * 检测是否为移动设备
   */
  _detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * 检测是否为平板
   */
  _detectTablet() {
    return /(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(navigator.userAgent);
  }

  /**
   * 检测是否为 iOS
   */
  _detectIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }

  /**
   * 检测是否为 Android
   */
  _detectAndroid() {
    return /Android/.test(navigator.userAgent);
  }

  /**
   * 获取屏幕方向
   */
  _getOrientation() {
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
  }

  /**
   * 监听屏幕方向变化
   */
  _initOrientationListener() {
    window.addEventListener('resize', () => {
      const newOrientation = this._getOrientation();
      if (newOrientation !== this.orientation) {
        this.orientation = newOrientation;
        this._triggerOrientationChange(newOrientation);
      }
    });
  }

  /**
   * 触发方向变化事件
   */
  _triggerOrientationChange(orientation) {
    const event = new CustomEvent('orientationchange', {
      detail: { orientation }
    });
    window.dispatchEvent(event);
  }

  /**
   * 获取设备信息
   */
  getDeviceInfo() {
    return {
      isMobile: this.isMobile,
      isTablet: this.isTablet,
      isIOS: this.isIOS,
      isAndroid: this.isAndroid,
      orientation: this.orientation,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      pixelRatio: window.devicePixelRatio || 1
    };
  }

  /**
   * 应用移动端优化
   */
  applyMobileOptimizations() {
    if (!this.isMobile) return;

    // 禁用双击缩放
    document.addEventListener('dblclick', (e) => {
      e.preventDefault();
    }, { passive: false });

    // 禁用长按菜单
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    // 添加触摸反馈
    document.body.style.webkitTapHighlightColor = 'transparent';
    document.body.style.webkitTouchCallout = 'none';
    document.body.style.webkitUserSelect = 'none';
    document.body.style.userSelect = 'none';
  }

  /**
   * 检测是否支持陀螺仪
   */
  async checkGyroscopeSupport() {
    if (!window.DeviceOrientationEvent) {
      return false;
    }

    // iOS 13+ 需要请求权限
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        return permission === 'granted';
      } catch (error) {
        return false;
      }
    }

    return true;
  }

  /**
   * 获取推荐的图片质量
   */
  getRecommendedImageQuality() {
    if (this.isMobile) {
      return this.isTablet ? 'medium' : 'low';
    }
    return 'high';
  }

  /**
   * 获取推荐的最大分辨率
   */
  getRecommendedMaxResolution() {
    const pixelRatio = window.devicePixelRatio || 1;
    const screenWidth = window.innerWidth * pixelRatio;

    if (this.isMobile) {
      return screenWidth <= 1080 ? 2048 : 4096;
    }
    return 8192;
  }
}

export default new MobileDetector();
