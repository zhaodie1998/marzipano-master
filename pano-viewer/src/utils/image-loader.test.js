/**
 * ImageLoader 单元测试
 * 使用 mock 避免 Canvas 依赖
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImageLoader } from './image-loader.js';

// Mock canvas context
const mockContext = {
  fillStyle: '',
  fillRect: vi.fn(),
  drawImage: vi.fn()
};

// Mock canvas
const mockCanvas = {
  width: 0,
  height: 0,
  getContext: vi.fn(() => mockContext),
  toDataURL: vi.fn(() => 'data:image/jpeg;base64,mockdata')
};

// Mock document.createElement for canvas
vi.spyOn(document, 'createElement').mockImplementation((tag) => {
  if (tag === 'canvas') {
    return mockCanvas;
  }
  return document.createElement.call(document, tag);
});

// 创建测试用的 mock 图片数据
const createMockImageData = () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

describe('ImageLoader', () => {
  let imageLoader;

  beforeEach(() => {
    imageLoader = new ImageLoader();
    vi.clearAllMocks();
  });

  describe('cache management', () => {
    it('should check if image is cached', () => {
      const imageData = createMockImageData();
      
      expect(imageLoader.isCached(imageData)).toBe(false);
    });

    it('should clear cache', () => {
      // 手动添加到缓存
      imageLoader.cache.set('test', { thumbnail: 'thumb', fullImage: 'full' });
      
      imageLoader.clearCache();
      
      expect(imageLoader.cache.size).toBe(0);
    });

    it('should evict oldest entry when cache is full', () => {
      imageLoader.maxCacheSize = 2;
      
      // 手动添加缓存项
      imageLoader.cache.set('key1', { data: 1 });
      imageLoader.cache.set('key2', { data: 2 });
      imageLoader._addToCache('key3', { data: 3 });
      
      expect(imageLoader.cache.size).toBe(2);
      expect(imageLoader.cache.has('key1')).toBe(false);
      expect(imageLoader.cache.has('key2')).toBe(true);
      expect(imageLoader.cache.has('key3')).toBe(true);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      imageLoader.cache.set('test', { data: 'test' });
      
      const stats = imageLoader.getCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(stats.size).toBe(1);
      expect(stats.maxSize).toBe(50);
    });
  });

  describe('_getCacheKey', () => {
    it('should return short strings as-is', () => {
      const shortUrl = 'http://example.com/image.jpg';
      const key = imageLoader._getCacheKey(shortUrl);
      
      expect(key).toBe(shortUrl);
    });

    it('should hash long strings', () => {
      const longData = 'data:image/png;base64,' + 'a'.repeat(200);
      const key = imageLoader._getCacheKey(longData);
      
      expect(key.startsWith('img_')).toBe(true);
      expect(key.length).toBeLessThan(longData.length);
    });
  });

  describe('_simpleHash', () => {
    it('should produce consistent hash for same input', () => {
      const input = 'test string';
      const hash1 = imageLoader._simpleHash(input);
      const hash2 = imageLoader._simpleHash(input);
      
      expect(hash1).toBe(hash2);
    });

    it('should produce different hash for different input', () => {
      const hash1 = imageLoader._simpleHash('string1');
      const hash2 = imageLoader._simpleHash('string2');
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateThumbnail', () => {
    it('should create canvas with correct dimensions for landscape image', async () => {
      const mockImg = { width: 400, height: 200 };
      
      await imageLoader.generateThumbnail(mockImg, 100);
      
      // 验证 canvas 尺寸设置（宽高比 2:1，最大尺寸 100）
      expect(mockCanvas.width).toBe(100);
      expect(mockCanvas.height).toBe(50);
    });

    it('should create canvas with correct dimensions for portrait image', async () => {
      const mockImg = { width: 200, height: 400 };
      
      await imageLoader.generateThumbnail(mockImg, 100);
      
      // 验证 canvas 尺寸设置（宽高比 1:2，最大尺寸 100）
      expect(mockCanvas.width).toBe(50);
      expect(mockCanvas.height).toBe(100);
    });

    it('should call toDataURL with jpeg format', async () => {
      const mockImg = { width: 100, height: 100 };
      
      await imageLoader.generateThumbnail(mockImg, 50);
      
      expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.7);
    });
  });

  describe('performance monitoring integration', () => {
    it('should record load time in performance monitor', async () => {
      // Import performance monitor to check integration
      const performanceMonitor = (await import('./performance-monitor.js')).default;
      
      // Clear any existing records
      performanceMonitor.imageLoadTimes = [];
      
      // Mock the _loadImage method to return quickly
      vi.spyOn(imageLoader, '_loadImage').mockResolvedValue({
        width: 100,
        height: 100
      });
      
      const imageData = createMockImageData();
      await imageLoader.loadProgressive(imageData);
      
      // Verify that performance monitor recorded the load time
      expect(performanceMonitor.imageLoadTimes.length).toBeGreaterThan(0);
      expect(performanceMonitor.imageLoadTimes[0].loadTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('error handling and caching', () => {
    it('should reject on invalid URL', async () => {
      vi.spyOn(imageLoader, '_loadImage').mockRejectedValue(new Error('图片加载失败'));
      const badData = 'http://invalid.example.com/image.jpg';
      await expect(imageLoader.loadProgressive(badData)).rejects.toThrow();
    });

    it('should return cached result on subsequent calls', async () => {
      vi.spyOn(imageLoader, '_loadImage').mockResolvedValue({ width: 100, height: 50 });
      const data = createMockImageData();
      const first = await imageLoader.loadProgressive(data);
      const second = await imageLoader.loadProgressive(data);
      expect(second).toEqual(first);
    });
  });
});
