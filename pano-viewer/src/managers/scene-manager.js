/**
 * 场景管理器
 * 负责场景的创建、切换、删除和资源管理
 */

import EventBus from '../core/event-bus.js';

class SceneManager {
  constructor(options = {}) {
    this.scenes = new Map();
    this.currentSceneId = null;
    this.loadedScenes = new Set();
    this.maxLoadedScenes = options.maxLoadedScenes || 5;
    this.eventBus = EventBus;
  }

  /**
   * 创建场景
   */
  createScene(sceneData) {
    const scene = {
      id: sceneData.id || this._generateId(),
      name: sceneData.name || '未命名场景',
      imageData: sceneData.imageData,
      thumbnail: sceneData.thumbnail || sceneData.imageData,
      hotspots: sceneData.hotspots || [],
      initialView: sceneData.initialView || { yaw: 0, pitch: 0, fov: 90 },
      groupId: sceneData.groupId || 'default',
      isLoaded: false,
      createdAt: Date.now()
    };

    this.scenes.set(scene.id, scene);
    this.eventBus.emit('scene:added', scene);
    
    return scene;
  }

  /**
   * 获取场景
   */
  getScene(sceneId) {
    return this.scenes.get(sceneId) || null;
  }

  /**
   * 获取所有场景
   */
  getAllScenes() {
    return Array.from(this.scenes.values());
  }

  /**
   * 获取当前场景
   */
  getCurrentScene() {
    return this.currentSceneId ? this.scenes.get(this.currentSceneId) : null;
  }

  /**
   * 切换场景
   */
  async switchScene(sceneId, options = {}) {
    const scene = this.scenes.get(sceneId);
    if (!scene) {
      throw new Error(`Scene not found: ${sceneId}`);
    }

    // 如果场景未加载，先加载
    if (!scene.isLoaded) {
      await this.loadScene(sceneId);
    }

    this.currentSceneId = sceneId;
    if (this.loadedScenes.has(sceneId)) {
      this.loadedScenes.delete(sceneId);
      this.loadedScenes.add(sceneId);
    }
    this.eventBus.emit('scene:switched', { scene, options });

    // 检查是否需要卸载其他场景
    this.unloadInactiveScenes(this.maxLoadedScenes);

    return scene;
  }

  /**
   * 加载场景资源
   */
  async loadScene(sceneId) {
    const scene = this.scenes.get(sceneId);
    if (!scene) return;

    // 模拟加载过程
    scene.isLoaded = true;
    this.loadedScenes.add(sceneId);
    
    this.eventBus.emit('scene:loaded', scene);
    return scene;
  }

  /**
   * 卸载场景资源
   */
  unloadScene(sceneId) {
    const scene = this.scenes.get(sceneId);
    if (!scene || sceneId === this.currentSceneId) return;

    scene.isLoaded = false;
    this.loadedScenes.delete(sceneId);
    
    this.eventBus.emit('scene:unloaded', scene);
  }

  /**
   * 卸载非活动场景
   */
  unloadInactiveScenes(keepCount) {
    if (this.loadedScenes.size <= keepCount) return;

    const scenesToUnload = [];
    const loadedArray = Array.from(this.loadedScenes);
    
    // 保留最近使用的场景
    for (let i = 0; i < loadedArray.length - keepCount; i++) {
      const sceneId = loadedArray[i];
      if (sceneId !== this.currentSceneId) {
        scenesToUnload.push(sceneId);
      }
    }

    scenesToUnload.forEach(id => this.unloadScene(id));
  }

  /**
   * 删除场景
   */
  deleteScene(sceneId) {
    const scene = this.scenes.get(sceneId);
    if (!scene) return false;

    // 清理资源
    this.unloadScene(sceneId);
    this.scenes.delete(sceneId);
    this.loadedScenes.delete(sceneId);

    // 如果删除的是当前场景，切换到其他场景
    if (this.currentSceneId === sceneId) {
      this.currentSceneId = null;
      const remaining = this.getAllScenes();
      if (remaining.length > 0) {
        this.switchScene(remaining[0].id);
      }
    }

    this.eventBus.emit('scene:removed', scene);
    return true;
  }

  /**
   * 生成唯一ID
   */
  _generateId() {
    return 'scene_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  }

  /**
   * 清空所有场景
   */
  clear() {
    this.scenes.clear();
    this.loadedScenes.clear();
    this.currentSceneId = null;
  }
}

export default SceneManager;
