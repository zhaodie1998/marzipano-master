/**
 * SceneManager 属性测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import SceneManager from './scene-manager.js';

// Mock EventBus
vi.mock('../core/event-bus.js', () => ({
  default: {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn()
  }
}));

describe('SceneManager Property Tests', () => {
  let sceneManager;

  beforeEach(() => {
    sceneManager = new SceneManager({ maxLoadedScenes: 5 });
  });

  /**
   * **Feature: pano-viewer-optimization, Property 2: Scene Unloading Threshold**
   * **Validates: Requirements 2.1**
   * 
   * For any collection of scenes where count exceeds the configured threshold,
   * calling unloadInactiveScenes SHALL result in only the most recently used
   * scenes remaining loaded, with total loaded scenes not exceeding the threshold.
   */
  it('loaded scenes should not exceed threshold after unloading', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 20 }),
            imageData: fc.constant('data:image/png;base64,test')
          }),
          { minLength: 1, maxLength: 15 }
        ),
        async (threshold, scenesData) => {
          sceneManager = new SceneManager({ maxLoadedScenes: threshold });
          
          // 创建并加载所有场景
          for (const data of scenesData) {
            const scene = sceneManager.createScene(data);
            await sceneManager.loadScene(scene.id);
          }
          
          // 卸载非活动场景
          sceneManager.unloadInactiveScenes(threshold);
          
          // 已加载场景数不应超过阈值
          expect(sceneManager.loadedScenes.size).toBeLessThanOrEqual(threshold);
          
          sceneManager.clear();
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * **Feature: pano-viewer-optimization, Property 3: Scene Reload on Switch**
   * **Validates: Requirements 2.2**
   * 
   * For any unloaded scene, switching to that scene SHALL trigger a reload,
   * and after the switch completes, the scene's isLoaded property SHALL be true.
   */
  it('switching to unloaded scene should reload it', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 20 }),
            imageData: fc.constant('data:image/png;base64,test')
          }),
          { minLength: 2, maxLength: 10 }
        ),
        async (scenesData) => {
          sceneManager = new SceneManager({ maxLoadedScenes: 1 });
          
          // 创建所有场景
          const scenes = scenesData.map(data => sceneManager.createScene(data));
          
          // 加载第一个场景
          await sceneManager.switchScene(scenes[0].id);
          
          // 卸载所有非活动场景
          sceneManager.unloadInactiveScenes(1);
          
          // 切换到另一个场景（应该触发重新加载）
          if (scenes.length > 1) {
            const targetScene = scenes[1];
            await sceneManager.switchScene(targetScene.id);
            
            // 切换后场景应该是已加载状态
            const scene = sceneManager.getScene(targetScene.id);
            expect(scene.isLoaded).toBe(true);
          }
          
          sceneManager.clear();
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * **Feature: pano-viewer-optimization, Property 4: Resource Cleanup on Delete**
   * **Validates: Requirements 2.5**
   * 
   * For any scene that is deleted, the scene's resources SHALL be removed
   * from the cache, and the scene SHALL no longer appear in getAllScenes().
   */
  it('deleted scene should be removed from all collections', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 20 }),
            imageData: fc.constant('data:image/png;base64,test')
          }),
          { minLength: 1, maxLength: 10 }
        ),
        fc.integer({ min: 0, max: 9 }),
        async (scenesData, deleteIndex) => {
          sceneManager = new SceneManager({ maxLoadedScenes: 10 });
          
          // 创建所有场景
          const scenes = scenesData.map(data => sceneManager.createScene(data));
          
          if (scenes.length === 0) return true;
          
          // 选择要删除的场景
          const indexToDelete = deleteIndex % scenes.length;
          const sceneToDelete = scenes[indexToDelete];
          
          // 加载场景
          await sceneManager.loadScene(sceneToDelete.id);
          
          // 删除场景
          sceneManager.deleteScene(sceneToDelete.id);
          
          // 验证场景已从所有集合中移除
          expect(sceneManager.getScene(sceneToDelete.id)).toBeNull();
          expect(sceneManager.getAllScenes().some(s => s.id === sceneToDelete.id)).toBe(false);
          expect(sceneManager.loadedScenes.has(sceneToDelete.id)).toBe(false);
          
          sceneManager.clear();
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * 属性测试：场景创建应返回有效场景对象
   */
  it('created scene should have all required properties', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          imageData: fc.constant('data:image/png;base64,test')
        }),
        (sceneData) => {
          const scene = sceneManager.createScene(sceneData);
          
          // 验证必需属性
          expect(scene).toHaveProperty('id');
          expect(scene).toHaveProperty('name');
          expect(scene).toHaveProperty('imageData');
          expect(scene).toHaveProperty('thumbnail');
          expect(scene).toHaveProperty('hotspots');
          expect(scene).toHaveProperty('initialView');
          expect(scene).toHaveProperty('isLoaded');
          expect(scene).toHaveProperty('createdAt');
          
          // 验证属性值
          expect(scene.name).toBe(sceneData.name);
          expect(Array.isArray(scene.hotspots)).toBe(true);
          expect(scene.isLoaded).toBe(false);
          
          sceneManager.clear();
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});
