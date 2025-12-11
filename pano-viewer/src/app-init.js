/**
 * 应用初始化模块
 * 整合所有模块并初始化应用
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

// 核心模块
import EventBus from './core/event-bus.js';

// 管理器
import { HistoryManager, Action } from './managers/history-manager.js';
import KeyboardManager from './managers/keyboard-manager.js';
import SceneManager from './managers/scene-manager.js';

// 工具
import ImageLoader from './utils/image-loader.js';
import MobileDetector from './utils/mobile-detector.js';
import PerformanceMonitor from './utils/performance-monitor.js';
import TouchGestureManager from './utils/touch-gesture.js';

/**
 * 应用初始化器
 */
class AppInitializer {
  constructor() {
    this.modules = {};
    this.initialized = false;
  }

  /**
   * 初始化所有模块
   */
  async init(options = {}) {
    if (this.initialized) {
      console.warn('App already initialized');
      return this.modules;
    }

    console.log('🚀 初始化全景编辑器模块...');

    try {
      // 1. 初始化事件总线
      this.modules.eventBus = EventBus;
      console.log('✅ EventBus 已初始化');

      // 2. 初始化性能监控
      this.modules.performanceMonitor = PerformanceMonitor;
      if (options.enablePerformanceMonitor) {
        PerformanceMonitor.start();
        console.log('✅ PerformanceMonitor 已启动');
      }

      // 3. 初始化移动端检测
      this.modules.mobileDetector = MobileDetector;
      if (MobileDetector.isMobile) {
        MobileDetector.applyMobileOptimizations();
        console.log('✅ 移动端优化已应用');
      }

      // 4. 初始化图片加载器
      this.modules.imageLoader = ImageLoader;
      console.log('✅ ImageLoader 已初始化');

      // 5. 初始化历史管理器
      this.modules.historyManager = new HistoryManager(options.maxHistorySize || 50);
      this._setupHistoryEvents();
      console.log('✅ HistoryManager 已初始化');

      // 6. 初始化键盘管理器
      this.modules.keyboardManager = KeyboardManager;
      this._registerDefaultShortcuts(options.shortcuts);
      console.log('✅ KeyboardManager 已初始化');

      // 7. 初始化场景管理器
      this.modules.sceneManager = new SceneManager({
        maxLoadedScenes: options.maxLoadedScenes || 5
      });
      this._setupSceneEvents();
      console.log('✅ SceneManager 已初始化');

      // 8. 初始化触摸手势（如果提供了元素）
      if (options.touchElement) {
        this.modules.touchGesture = new TouchGestureManager(options.touchElement);
        this._setupTouchGestures();
        console.log('✅ TouchGestureManager 已初始化');
      }

      this.initialized = true;
      console.log('🎉 所有模块初始化完成');

      // 发送初始化完成事件
      EventBus.emit('app:initialized', this.modules);

      return this.modules;
    } catch (error) {
      console.error('❌ 模块初始化失败:', error);
      throw error;
    }
  }

  /**
   * 设置历史事件
   */
  _setupHistoryEvents() {
    this.modules.historyManager.addListener((info) => {
      this.modules.eventBus.emit('history:changed', info);
    });
  }

  /**
   * 设置场景事件
   */
  _setupSceneEvents() {
    // 场景事件已在 SceneManager 内部通过 EventBus 发送
  }

  /**
   * 注册默认快捷键
   */
  _registerDefaultShortcuts(customShortcuts = {}) {
    const km = this.modules.keyboardManager;
    const defaults = {
      'SPACE': { handler: () => this._emit('shortcut:toggleAutoRotate'), desc: '切换自动旋转' },
      'F': { handler: () => this._emit('shortcut:toggleFullscreen'), desc: '切换全屏' },
      'H': { handler: () => this._emit('shortcut:toggleHotspots'), desc: '切换热点显示' },
      'CTRL+S': { handler: () => this._emit('shortcut:save'), desc: '保存项目' },
      'CTRL+E': { handler: () => this._emit('shortcut:export'), desc: '导出项目' },
      'CTRL+Z': { handler: () => this.modules.historyManager.undo(), desc: '撤销' },
      'CTRL+Y': { handler: () => this.modules.historyManager.redo(), desc: '重做' },
      'DELETE': { handler: () => this._emit('shortcut:delete'), desc: '删除选中项' },
      'LEFT': { handler: () => this._emit('shortcut:prevScene'), desc: '上一个场景' },
      'RIGHT': { handler: () => this._emit('shortcut:nextScene'), desc: '下一个场景' },
      '?': { handler: () => this._emit('shortcut:showHelp'), desc: '显示帮助' },
      'P': { handler: () => this._togglePerformancePanel(), desc: '切换性能面板' }
    };

    // 合并自定义快捷键
    const shortcuts = { ...defaults, ...customShortcuts };

    // 注册所有快捷键
    Object.entries(shortcuts).forEach(([key, config]) => {
      km.register(key, config.handler, config.desc);
    });
  }

  /**
   * 设置触摸手势
   */
  _setupTouchGestures() {
    const tg = this.modules.touchGesture;

    tg.on('onDrag', (data) => {
      this.modules.eventBus.emit('gesture:drag', data);
    });

    tg.on('onPinch', (data) => {
      this.modules.eventBus.emit('gesture:pinch', data);
    });

    tg.on('onDoubleTap', (data) => {
      this.modules.eventBus.emit('gesture:doubleTap', data);
    });

    tg.on('onLongPress', (data) => {
      this.modules.eventBus.emit('gesture:longPress', data);
    });

    tg.on('onInertia', (data) => {
      this.modules.eventBus.emit('gesture:inertia', data);
    });
  }

  /**
   * 发送事件
   */
  _emit(event, data) {
    this.modules.eventBus.emit(event, data);
  }

  /**
   * 切换性能面板
   */
  _togglePerformancePanel() {
    const pm = this.modules.performanceMonitor;
    if (pm.panel) {
      pm.hidePanel();
    } else {
      pm.start();
      pm.showPanel();
    }
  }

  /**
   * 获取模块
   */
  getModule(name) {
    return this.modules[name];
  }

  /**
   * 销毁所有模块
   */
  destroy() {
    if (this.modules.touchGesture) {
      this.modules.touchGesture.destroy();
    }
    if (this.modules.keyboardManager) {
      this.modules.keyboardManager.destroy();
    }
    if (this.modules.performanceMonitor) {
      this.modules.performanceMonitor.stop();
      this.modules.performanceMonitor.hidePanel();
    }
    if (this.modules.eventBus) {
      this.modules.eventBus.clear();
    }

    this.modules = {};
    this.initialized = false;
    console.log('🔚 所有模块已销毁');
  }
}

// 导出单例
const appInitializer = new AppInitializer();
export default appInitializer;

// 导出类和模块以便直接使用
export {
  AppInitializer,
  EventBus,
  HistoryManager,
  Action,
  KeyboardManager,
  SceneManager,
  ImageLoader,
  MobileDetector,
  PerformanceMonitor,
  TouchGestureManager
};
