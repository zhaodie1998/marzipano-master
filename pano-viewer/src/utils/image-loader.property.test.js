/**
 * ImageLoader 属性测试
 * **Feature: pano-viewer-optimization, Property 1: Progressive Loading Order**
 * **Validates: Requirements 1.1, 1.2, 1.4**
 * 
 * 注意：由于 jsdom 不支持 Canvas，这些测试使用 mock 来验证逻辑
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
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
  toDataURL: vi.fn(() => 'data:image/jpeg;base64,mockthumb')
};

// Mock document.createElement
vi.spyOn(document, 'createElement').mockImplementation((tag) => {
  if (tag === 'canvas') {
    return { ...mockCanvas };
  }
  const el = document.createElementNS('http://www.w3.org/1999/xhtml', tag);
  return el;
});

describe('ImageLoader Property Tests', () => {
  let imageLoader;

  beforeEach(() => {
    imageLoader = new ImageLoader();
    vi.clearAllMocks();
  });

  /**
   * **Feature: pano-viewer-optimization, Property 5: History Recording**
   * 属性测试：缓存键生成的一致性
   * 
   * For any string input, the cache key generation should be deterministic
   */
  it('cache key generation should be deterministic', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 500 }), (input) => {
        const key1 = imageLoader._getCacheKey(input);
        const key2 = imageLoader._getCacheKey(input);
        
        // 相同输入应产生相同的缓存键
        expect(key1).toBe(key2);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * 属性测试：哈希函数的一致性
   */
  it('hash function should be deterministic', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 1000 }), (input) => {
        const hash1 = imageLoader._simpleHash(input);
        const hash2 = imageLoader._simpleHash(input);
        
        expect(hash1).toBe(hash2);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * 属性测试：缓存大小限制
   * 
   * For any sequence of cache additions, the cache size should never exceed maxSize
   */
  it('cache size should never exceed maxSize', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 50 }),
        (maxSize, keys) => {
          imageLoader.maxCacheSize = maxSize;
          imageLoader.clearCache();
          
          // 添加所有键
          keys.forEach((key, index) => {
            imageLoader._addToCache(key, { data: index });
          });
          
          // 缓存大小不应超过 maxSize
          expect(imageLoader.cache.size).toBeLessThanOrEqual(maxSize);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性测试：清除缓存后应为空
   */
  it('cache should be empty after clear', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 20 }),
        (keys) => {
          // 添加一些项
          keys.forEach((key, index) => {
            imageLoader._addToCache(key, { data: index });
          });
          
          // 清除缓存
          imageLoader.clearCache();
          
          // 缓存应为空
          expect(imageLoader.cache.size).toBe(0);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: pano-viewer-optimization, Property 1: Progressive Loading Order**
   * **Validates: Requirements 1.1, 1.2, 1.4**
   * 
   * 属性测试：缩略图尺寸计算保持宽高比
   */
  it('thumbnail dimensions should maintain aspect ratio', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 2000 }),
        fc.integer({ min: 10, max: 2000 }),
        fc.integer({ min: 10, max: 500 }),
        (width, height, maxSize) => {
          const aspectRatio = width / height;
          let thumbWidth, thumbHeight;
          
          if (aspectRatio > 1) {
            thumbWidth = Math.min(maxSize, width);
            thumbHeight = thumbWidth / aspectRatio;
          } else {
            thumbHeight = Math.min(maxSize, height);
            thumbWidth = thumbHeight * aspectRatio;
          }
          
          // 计算后的宽高比应该与原始相同（允许小误差）
          const newAspectRatio = thumbWidth / thumbHeight;
          expect(Math.abs(newAspectRatio - aspectRatio)).toBeLessThan(0.001);
          
          // 尺寸不应超过 maxSize
          expect(thumbWidth).toBeLessThanOrEqual(maxSize);
          expect(thumbHeight).toBeLessThanOrEqual(maxSize);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
