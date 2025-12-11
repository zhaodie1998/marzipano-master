# 快速开始优化指南

## 🎯 立即可用的优化

### 1. 集成新工具模块

已创建的工具模块位于 `src/utils/` 目录：

```javascript
// 在 app.js 或 app-pro.js 中引入
import imageLoader from './src/utils/image-loader.js';
import { HistoryManager } from './src/utils/history-manager.js';
import keyboardManager from './src/utils/keyboard-manager.js';
import performanceMonitor from './src/utils/performance-monitor.js';
import mobileDetector from './src/utils/mobile-detector.js';
```

### 2. 使用图片加载优化

```javascript
// 替换原有的 FileReader 方式
async function handleFileSelect(e) {
  const files = Array.from(e.target.files);
  
  for (const file of files) {
    const url = URL.createObjectURL(file);
    
    // 使用渐进式加载
    const imageData = await imageLoader.loadProgressive(url, (percent) => {
      setProgress(percent, `加载 ${file.name}`);
    });
    
    createScene(imageData, file.name);
  }
}
```

### 3. 添加撤销/重做功能

```javascript
// 初始化历史管理器
const historyManager = new HistoryManager();

// 监听状态变化
historyManager.addListener((state) => {
  document.getElementById('undoBtn').disabled = !state.canUndo;
  document.getElementById('redoBtn').disabled = !state.canRedo;
});

// 使用示例：添加场景
function addScene(sceneData) {
  const action = new AddSceneAction(sceneManager, sceneData);
  historyManager.execute(action);
}

// 撤销/重做
document.getElementById('undoBtn').onclick = () => historyManager.undo();
document.getElementById('redoBtn').onclick = () => historyManager.redo();
```

### 4. 注册快捷键

```javascript
// 注册常用快捷键
keyboardManager.register('CTRL+Z', () => {
  historyManager.undo();
}, '撤销');

keyboardManager.register('CTRL+Y', () => {
  historyManager.redo();
}, '重做');

keyboardManager.register('CTRL+S', (e) => {
  saveProject();
}, '保存项目');

keyboardManager.register('F', () => {
  toggleFullscreen();
}, '全屏切换');

keyboardManager.register('SPACE', () => {
  toggleAutoRotate();
}, '自动旋转');

keyboardManager.register('H', () => {
  toggleHotspots();
}, '显示/隐藏热点');

// 显示快捷键帮助
function showKeyboardHelp() {
  const shortcuts = keyboardManager.getAll();
  const helpText = shortcuts.map(s => 
    `${s.key}: ${s.description}`
  ).join('\n');
  alert('快捷键列表:\n\n' + helpText);
}
```

### 5. 性能监控

```javascript
// 开发模式下启用性能监控
if (window.location.hostname === 'localhost') {
  performanceMonitor.start();
  performanceMonitor.showPanel();
}

// 测量加载时间
performanceMonitor.measureLoadTime('场景加载', async () => {
  await loadScene(sceneData);
});

// 获取性能报告
const report = performanceMonitor.getReport();
console.log('性能报告:', report);
```

### 6. 移动端适配

```javascript
// 初始化移动端检测
const deviceInfo = mobileDetector.getDeviceInfo();
console.log('设备信息:', deviceInfo);

// 应用移动端优化
if (deviceInfo.isMobile) {
  mobileDetector.applyMobileOptimizations();
  
  // 使用推荐的图片质量
  const quality = mobileDetector.getRecommendedImageQuality();
  const maxRes = mobileDetector.getRecommendedMaxResolution();
  
  console.log(`推荐质量: ${quality}, 最大分辨率: ${maxRes}`);
}

// 监听屏幕方向变化
window.addEventListener('orientationchange', (e) => {
  console.log('屏幕方向:', e.detail.orientation);
  adjustLayout(e.detail.orientation);
});

// 陀螺仪支持检测
async function enableGyroscope() {
  const supported = await mobileDetector.checkGyroscopeSupport();
  if (supported) {
    // 启用陀螺仪控制
    initGyroscopeControl();
  } else {
    alert('您的设备不支持陀螺仪');
  }
}
```

---

## 🔧 HTML 更新

在 `index.html` 或 `index-pro.html` 中添加新按钮：

```html
<!-- 撤销/重做按钮 -->
<div class="history-controls">
  <button id="undoBtn" class="control-btn" title="撤销 (Ctrl+Z)" disabled>
    ↶ 撤销
  </button>
  <button id="redoBtn" class="control-btn" title="重做 (Ctrl+Y)" disabled>
    ↷ 重做
  </button>
</div>

<!-- 快捷键帮助 -->
<button id="keyboardHelpBtn" class="control-btn" title="快捷键">
  ⌨️ 快捷键
</button>

<!-- 性能监控（开发模式） -->
<button id="perfBtn" class="control-btn" title="性能监控">
  📊 性能
</button>
```

---

## 🎨 CSS 更新

```css
/* 历史控制按钮 */
.history-controls {
  display: flex;
  gap: 8px;
  margin-right: 16px;
}

.history-controls button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .history-controls {
    display: none; /* 移动端隐藏 */
  }
  
  .control-bar {
    flex-wrap: wrap;
    padding: 8px;
  }
  
  .control-btn {
    font-size: 12px;
    padding: 6px 10px;
  }
}

/* 性能面板样式已在 performance-monitor.js 中定义 */
```

---

## 📱 移动端布局优化

```css
/* 移动端单栏布局 */
@media (max-width: 768px) {
  .app-container {
    flex-direction: column;
  }
  
  .sidebar {
    width: 100%;
    height: 150px;
    overflow-x: auto;
    overflow-y: hidden;
  }
  
  .scene-list {
    display: flex;
    flex-direction: row;
  }
  
  .scene-item {
    min-width: 120px;
    flex-shrink: 0;
  }
  
  .properties-panel {
    width: 100%;
    height: 50vh;
    bottom: 0;
    left: 0;
    right: 0;
    transform: translateY(100%);
  }
  
  .properties-panel.show {
    transform: translateY(0);
  }
}

/* 横屏模式 */
@media (max-width: 768px) and (orientation: landscape) {
  .sidebar {
    height: 100px;
  }
  
  .properties-panel {
    height: 40vh;
  }
}
```

---

## ⚡ 性能优化建议

### 1. 图片压缩

```javascript
// 使用 Canvas 压缩图片
function compressImage(file, maxWidth = 4096, quality = 0.85) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/jpeg', quality);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
```

### 2. 懒加载场景

```javascript
// 只加载可见场景
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const sceneId = entry.target.dataset.sceneId;
      loadSceneIfNeeded(sceneId);
    }
  });
});

// 观察场景缩略图
document.querySelectorAll('.scene-item').forEach(item => {
  observer.observe(item);
});
```

### 3. 防抖节流

```javascript
// 防抖函数
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// 节流函数
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// 使用示例
const debouncedSave = debounce(saveProject, 1000);
const throttledUpdate = throttle(updateViewInfo, 100);
```

---

## 🚀 下一步

1. **测试新功能**
   - 在浏览器中测试所有新工具
   - 检查移动端适配效果
   - 验证性能提升

2. **逐步集成**
   - 先集成图片加载优化
   - 再添加撤销/重做
   - 最后完善移动端

3. **性能测试**
   - 使用 Lighthouse 测试
   - 检查 FPS 和内存使用
   - 优化加载时间

4. **用户反馈**
   - 收集使用体验
   - 调整优化策略
   - 持续改进

---

**开始优化，提升体验！** 🎉
