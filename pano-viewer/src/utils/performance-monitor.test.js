/**
 * PerformanceMonitor 单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('PerformanceMonitor', () => {
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

  describe('start/stop', () => {
    it('should start monitoring', () => {
      PerformanceMonitor.start();
      expect(PerformanceMonitor.isMonitoring).toBe(true);
    });

    it('should stop monitoring', () => {
      PerformanceMonitor.start();
      PerformanceMonitor.stop();
      expect(PerformanceMonitor.isMonitoring).toBe(false);
    });

    it('should not start twice', () => {
      PerformanceMonitor.start();
      PerformanceMonitor.start();
      expect(PerformanceMonitor.isMonitoring).toBe(true);
    });
  });

  describe('measureLoadTime', () => {
    it('should measure sync function load time', () => {
      const result = PerformanceMonitor.measureLoadTime('test', () => {
        return 'result';
      });
      
      expect(result).toBe('result');
      expect(PerformanceMonitor.metrics.loadTime).toBeGreaterThanOrEqual(0);
    });

    it('should measure async function load time', async () => {
      const result = await PerformanceMonitor.measureLoadTime('test', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async result';
      });
      
      expect(result).toBe('async result');
      expect(PerformanceMonitor.metrics.loadTime).toBeGreaterThanOrEqual(10);
    });
  });

  describe('getReport', () => {
    it('should return performance report', () => {
      const report = PerformanceMonitor.getReport();
      
      expect(report).toHaveProperty('currentFPS');
      expect(report).toHaveProperty('averageFPS');
      expect(report).toHaveProperty('loadTime');
    });

    it('should calculate average FPS correctly', () => {
      // 手动添加 FPS 历史
      PerformanceMonitor.fpsHistory = [60, 55, 50, 65, 70];
      
      const report = PerformanceMonitor.getReport();
      
      expect(report.averageFPS).toBe(60); // (60+55+50+65+70)/5 = 60
      expect(report.minFPS).toBe(50);
      expect(report.maxFPS).toBe(70);
    });
  });

  describe('panel', () => {
    it('should show panel', () => {
      PerformanceMonitor.start();
      PerformanceMonitor.showPanel();
      
      expect(PerformanceMonitor.panel).not.toBeNull();
      expect(document.body.contains(PerformanceMonitor.panel)).toBe(true);
    });

    it('should hide panel', () => {
      PerformanceMonitor.start();
      PerformanceMonitor.showPanel();
      PerformanceMonitor.hidePanel();
      
      expect(PerformanceMonitor.panel).toBeNull();
    });

    it('should not create duplicate panels', () => {
      PerformanceMonitor.start();
      PerformanceMonitor.showPanel();
      PerformanceMonitor.showPanel();
      
      const panels = document.querySelectorAll('[style*="position: fixed"]');
      // 只应该有一个面板
      expect(panels.length).toBeLessThanOrEqual(1);
    });
  });

  describe('recordImageLoadTime', () => {
    it('should record image load time', () => {
      PerformanceMonitor.recordImageLoadTime('image1', 150);
      
      expect(PerformanceMonitor.imageLoadTimes.length).toBe(1);
      expect(PerformanceMonitor.imageLoadTimes[0].imageId).toBe('image1');
      expect(PerformanceMonitor.imageLoadTimes[0].loadTime).toBe(150);
      expect(PerformanceMonitor.metrics.loadTime).toBe(150);
    });

    it('should maintain history limit', () => {
      PerformanceMonitor.maxImageLoadHistory = 3;
      
      PerformanceMonitor.recordImageLoadTime('img1', 100);
      PerformanceMonitor.recordImageLoadTime('img2', 200);
      PerformanceMonitor.recordImageLoadTime('img3', 300);
      PerformanceMonitor.recordImageLoadTime('img4', 400);
      
      expect(PerformanceMonitor.imageLoadTimes.length).toBe(3);
      expect(PerformanceMonitor.imageLoadTimes[0].imageId).toBe('img2');
      expect(PerformanceMonitor.imageLoadTimes[2].imageId).toBe('img4');
    });
  });

  describe('getImageLoadStats', () => {
    it('should return empty stats when no images loaded', () => {
      const stats = PerformanceMonitor.getImageLoadStats();
      
      expect(stats.count).toBe(0);
      expect(stats.averageLoadTime).toBe(0);
      expect(stats.minLoadTime).toBe(0);
      expect(stats.maxLoadTime).toBe(0);
    });

    it('should calculate image load statistics', () => {
      PerformanceMonitor.recordImageLoadTime('img1', 100);
      PerformanceMonitor.recordImageLoadTime('img2', 200);
      PerformanceMonitor.recordImageLoadTime('img3', 300);
      
      const stats = PerformanceMonitor.getImageLoadStats();
      
      expect(stats.count).toBe(3);
      expect(stats.averageLoadTime).toBe(200);
      expect(stats.minLoadTime).toBe(100);
      expect(stats.maxLoadTime).toBe(300);
      expect(stats.totalLoadTime).toBe(600);
    });

    it('should include recent loads', () => {
      PerformanceMonitor.recordImageLoadTime('img1', 100);
      PerformanceMonitor.recordImageLoadTime('img2', 200);
      
      const stats = PerformanceMonitor.getImageLoadStats();
      
      expect(stats.recentLoads).toHaveLength(2);
      expect(stats.recentLoads[0].imageId).toBe('img1');
      expect(stats.recentLoads[1].imageId).toBe('img2');
    });
  });

  describe('getReport with image loads', () => {
    it('should include image load stats in report', () => {
      PerformanceMonitor.recordImageLoadTime('img1', 150);
      PerformanceMonitor.recordImageLoadTime('img2', 250);
      
      const report = PerformanceMonitor.getReport();
      
      expect(report.imageLoads).toBeDefined();
      expect(report.imageLoads.count).toBe(2);
      expect(report.imageLoads.averageLoadTime).toBe(200);
    });
  });
});
