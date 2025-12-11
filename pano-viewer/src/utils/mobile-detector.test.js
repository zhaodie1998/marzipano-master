/**
 * MobileDetector 单元测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// 模拟 navigator.userAgent
const mockUserAgent = (ua) => {
  Object.defineProperty(navigator, 'userAgent', {
    value: ua,
    writable: true,
    configurable: true
  });
};

describe('MobileDetector', () => {
  let MobileDetector;

  beforeEach(async () => {
    // 重置模块缓存以便每次测试使用新的 userAgent
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('device detection', () => {
    it('should detect mobile device from iPhone userAgent', async () => {
      mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)');
      const module = await import('./mobile-detector.js');
      MobileDetector = module.default;
      
      expect(MobileDetector.isMobile).toBe(true);
      expect(MobileDetector.isIOS).toBe(true);
    });

    it('should detect Android device', async () => {
      mockUserAgent('Mozilla/5.0 (Linux; Android 11; Pixel 5)');
      const module = await import('./mobile-detector.js');
      MobileDetector = module.default;
      
      expect(MobileDetector.isMobile).toBe(true);
      expect(MobileDetector.isAndroid).toBe(true);
    });

    it('should detect desktop device', async () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      const module = await import('./mobile-detector.js');
      MobileDetector = module.default;
      
      expect(MobileDetector.isMobile).toBe(false);
    });

    it('should detect tablet device', async () => {
      mockUserAgent('Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)');
      const module = await import('./mobile-detector.js');
      MobileDetector = module.default;
      
      expect(MobileDetector.isTablet).toBe(true);
    });
  });

  describe('getDeviceInfo', () => {
    it('should return complete device info object', async () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
      const module = await import('./mobile-detector.js');
      MobileDetector = module.default;
      
      const info = MobileDetector.getDeviceInfo();
      
      expect(info).toHaveProperty('isMobile');
      expect(info).toHaveProperty('isTablet');
      expect(info).toHaveProperty('isIOS');
      expect(info).toHaveProperty('isAndroid');
      expect(info).toHaveProperty('orientation');
      expect(info).toHaveProperty('screenWidth');
      expect(info).toHaveProperty('screenHeight');
      expect(info).toHaveProperty('pixelRatio');
    });
  });

  describe('getRecommendedImageQuality', () => {
    it('should return low for mobile phones', async () => {
      mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)');
      const module = await import('./mobile-detector.js');
      MobileDetector = module.default;
      
      // 模拟非平板移动设备
      MobileDetector.isTablet = false;
      
      expect(MobileDetector.getRecommendedImageQuality()).toBe('low');
    });

    it('should return high for desktop', async () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
      const module = await import('./mobile-detector.js');
      MobileDetector = module.default;
      
      expect(MobileDetector.getRecommendedImageQuality()).toBe('high');
    });
  });
});
