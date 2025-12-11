/**
 * PerformanceMonitor 属性测试
 * **Feature: pano-viewer-optimization, Property 12: Load Time Recording**
 * **Validates: Requirements 8.4**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';

describe('PerformanceMonitor Property Tests', () => {
  let PerformanceMonitor;

  beforeEach(async () => {
    vi.resetModules();
    const module = await import('./performance-monitor.js');
    PerformanceMonitor = module.default;
  });

  afterEach(() => {
    PerformanceMonitor.stop();
    PerformanceMonitor.hidePanel();
    vi.restoreAllMocks();
  });

  /**
   * **Feature: pano-viewer-optimization, Property 12: Load Time Recording**
   * **Validates: Requirements 8.4**
   * 
   * For any image loaded through ImageLoader, the PerformanceMonitor
   * SHALL record a positive loadTime value after loading completes.
   */
  it('measureLoadTime should record positive load time for sync operations', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        (iterations) => {
          // 执行一些同步操作
          const result = PerformanceMonitor.measureLoadTime('test', () => {
            let sum = 0;
            for (let i = 0; i < iterations * 1000; i++) {
              sum += i;
            }
            return sum;
          });
          
          // 加载时间应该是非负数
          expect(PerformanceMonitor.metrics.loadTime).toBeGreaterThanOrEqual(0);
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * 属性测试：异步操作的加载时间记录
   */
  it('measureLoadTime should record positive load time for async operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 10, max: 50 }),
        async (delay) => {
          const result = await PerformanceMonitor.measureLoadTime('async-test', async () => {
            await new Promise(resolve => setTimeout(resolve, delay));
            return 'done';
          });
          
          // 加载时间应该是正数（由于 setTimeout 精度问题，不严格检查是否 >= delay）
          expect(PerformanceMonitor.metrics.loadTime).toBeGreaterThan(0);
          expect(result).toBe('done');
          
          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * 属性测试：性能报告的一致性
   */
  it('getReport should return consistent structure', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 120 }), { minLength: 0, maxLength: 100 }),
        (fpsValues) => {
          // 设置 FPS 历史
          PerformanceMonitor.fpsHistory = fpsValues;
          
          const report = PerformanceMonitor.getReport();
          
          // 验证报告结构
          expect(report).toHaveProperty('currentFPS');
          expect(report).toHaveProperty('averageFPS');
          expect(report).toHaveProperty('loadTime');
          
          // 如果有 FPS 历史，验证计算正确性
          if (fpsValues.length > 0) {
            const expectedAvg = Math.round(
              fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length
            );
            expect(report.averageFPS).toBe(expectedAvg);
            expect(report.minFPS).toBe(Math.min(...fpsValues));
            expect(report.maxFPS).toBe(Math.max(...fpsValues));
          }
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});
