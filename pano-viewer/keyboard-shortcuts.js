// 键盘快捷键管理器 - Marzipano Pro Editor

class KeyboardShortcuts {
  constructor() {
    this.shortcuts = new Map();
    this.enabled = true;
    this.init();
  }

  /**
   * 初始化快捷键
   */
  init() {
    // 注册默认快捷键
    this.register('ctrl+s', this.handleSave.bind(this), '保存项目');
    this.register('ctrl+o', this.handleOpen.bind(this), '打开文件');
    this.register('ctrl+z', this.handleUndo.bind(this), '撤销');
    this.register('ctrl+y', this.handleRedo.bind(this), '重做');
    this.register('delete', this.handleDelete.bind(this), '删除选中项');
    this.register('escape', this.handleEscape.bind(this), '取消/关闭');
    this.register('f11', this.handleFullscreen.bind(this), '全屏');
    this.register('ctrl+h', this.handleToggleHotspot.bind(this), '添加热点');
    this.register('ctrl+m', this.handleToggleMusic.bind(this), '添加音乐');
    this.register('ctrl+t', this.handleToggleText.bind(this), '添加文字');
    this.register('ctrl+shift+s', this.handleScreenshot.bind(this), '截图');
    this.register('ctrl+/', this.handleShowHelp.bind(this), '显示帮助');
    this.register('space', this.handleToggleAutoRotate.bind(this), '自动旋转');
    this.register('left', this.handlePrevScene.bind(this), '上一个场景');
    this.register('right', this.handleNextScene.bind(this), '下一个场景');
    this.register('up', this.handleZoomIn.bind(this), '放大');
    this.register('down', this.handleZoomOut.bind(this), '缩小');
    this.register('r', this.handleResetView.bind(this), '重置视角');
    this.register('1', () => this.handleViewMode(1), '场景列表视图');
    this.register('2', () => this.handleViewMode(2), '网格视图');
    
    // 监听键盘事件
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    
    console.log('✅ 键盘快捷键已加载');
  }

  /**
   * 注册快捷键
   * @param {string} key - 快捷键组合（如 'ctrl+s'）
   * @param {Function} handler - 处理函数
   * @param {string} description - 描述
   */
  register(key, handler, description = '') {
    this.shortcuts.set(key.toLowerCase(), {
      handler,
      description
    });
  }

  /**
   * 解析按键组合
   * @param {KeyboardEvent} event - 键盘事件
   * @returns {string} 按键组合字符串
   */
  parseKeyCombo(event) {
    const parts = [];
    
    if (event.ctrlKey || event.metaKey) parts.push('ctrl');
    if (event.shiftKey) parts.push('shift');
    if (event.altKey) parts.push('alt');
    
    const key = event.key.toLowerCase();
    if (!['control', 'shift', 'alt', 'meta'].includes(key)) {
      parts.push(key);
    }
    
    return parts.join('+');
  }

  /**
   * 处理键盘按下事件
   * @param {KeyboardEvent} event - 键盘事件
   */
  handleKeyDown(event) {
    if (!this.enabled) return;
    
    // 忽略输入框内的快捷键（除了Escape）
    const tagName = event.target.tagName.toLowerCase();
    if (['input', 'textarea', 'select'].includes(tagName) && event.key !== 'Escape') {
      return;
    }
    
    const combo = this.parseKeyCombo(event);
    const shortcut = this.shortcuts.get(combo);
    
    if (shortcut) {
      event.preventDefault();
      shortcut.handler(event);
    }
  }

  /**
   * 启用快捷键
   */
  enable() {
    this.enabled = true;
  }

  /**
   * 禁用快捷键
   */
  disable() {
    this.enabled = false;
  }

  /**
   * 获取所有快捷键列表
   * @returns {Array} 快捷键列表
   */
  getShortcutList() {
    const list = [];
    this.shortcuts.forEach((value, key) => {
      list.push({
        key: this.formatKey(key),
        description: value.description
      });
    });
    return list.sort((a, b) => a.key.localeCompare(b.key));
  }

  /**
   * 格式化按键显示
   * @param {string} key - 按键组合
   * @returns {string} 格式化后的显示
   */
  formatKey(key) {
    return key
      .split('+')
      .map(k => {
        const keyMap = {
          'ctrl': 'Ctrl',
          'shift': 'Shift',
          'alt': 'Alt',
          'left': '←',
          'right': '→',
          'up': '↑',
          'down': '↓',
          'escape': 'Esc',
          'delete': 'Del',
          'space': 'Space'
        };
        return keyMap[k] || k.toUpperCase();
      })
      .join(' + ');
  }

  // ==================== 快捷键处理函数 ====================

  handleSave(event) {
    console.log('快捷键: 保存');
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) saveBtn.click();
  }

  handleOpen(event) {
    console.log('快捷键: 打开文件');
    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.click();
  }

  handleUndo(event) {
    console.log('快捷键: 撤销');
    // 实现撤销逻辑
    this.showToast('撤销功能开发中');
  }

  handleRedo(event) {
    console.log('快捷键: 重做');
    // 实现重做逻辑
    this.showToast('重做功能开发中');
  }

  handleDelete(event) {
    console.log('快捷键: 删除');
    // 删除当前选中的热点或场景
    if (window.appState && window.appState.selectedHotspot) {
      // 删除热点
      if (window.deleteHotspot) {
        window.deleteHotspot(window.appState.selectedHotspot);
      }
    }
  }

  handleEscape(event) {
    console.log('快捷键: 取消');
    // 关闭所有模态框
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      if (modal.style.display !== 'none') {
        modal.style.display = 'none';
      }
    });
    
    // 取消选中
    if (window.appState) {
      window.appState.selectedHotspot = null;
    }
  }

  handleFullscreen(event) {
    console.log('快捷键: 全屏');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (fullscreenBtn) fullscreenBtn.click();
  }

  handleToggleHotspot(event) {
    console.log('快捷键: 添加热点');
    const addHotspotBtn = document.getElementById('addHotspotBtn');
    if (addHotspotBtn) addHotspotBtn.click();
  }

  handleToggleMusic(event) {
    console.log('快捷键: 添加音乐');
    const addMusicBtn = document.getElementById('addMusicBtn');
    if (addMusicBtn) addMusicBtn.click();
  }

  handleToggleText(event) {
    console.log('快捷键: 添加文字');
    const addTextBtn = document.getElementById('addTextBtn');
    if (addTextBtn) addTextBtn.click();
  }

  handleScreenshot(event) {
    console.log('快捷键: 截图');
    const screenshotBtn = document.getElementById('screenshotBtn');
    if (screenshotBtn) screenshotBtn.click();
  }

  handleShowHelp(event) {
    console.log('快捷键: 显示帮助');
    this.showShortcutsPanel();
  }

  handleToggleAutoRotate(event) {
    console.log('快捷键: 自动旋转');
    const autoRotateBtn = document.getElementById('autoRotateBtn');
    if (autoRotateBtn) autoRotateBtn.click();
  }

  handlePrevScene(event) {
    console.log('快捷键: 上一个场景');
    if (window.appState && window.appState.scenes.length > 0) {
      const currentIndex = window.appState.scenes.findIndex(
        s => s.id === window.appState.currentScene?.id
      );
      if (currentIndex > 0 && window.switchScene) {
        window.switchScene(window.appState.scenes[currentIndex - 1].id);
      }
    }
  }

  handleNextScene(event) {
    console.log('快捷键: 下一个场景');
    if (window.appState && window.appState.scenes.length > 0) {
      const currentIndex = window.appState.scenes.findIndex(
        s => s.id === window.appState.currentScene?.id
      );
      if (currentIndex < window.appState.scenes.length - 1 && window.switchScene) {
        window.switchScene(window.appState.scenes[currentIndex + 1].id);
      }
    }
  }

  handleZoomIn(event) {
    console.log('快捷键: 放大');
    const zoomInBtn = document.getElementById('zoomInBtn');
    if (zoomInBtn) zoomInBtn.click();
  }

  handleZoomOut(event) {
    console.log('快捷键: 缩小');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    if (zoomOutBtn) zoomOutBtn.click();
  }

  handleResetView(event) {
    console.log('快捷键: 重置视角');
    const resetViewBtn = document.getElementById('resetViewBtn');
    if (resetViewBtn) resetViewBtn.click();
  }

  handleViewMode(mode) {
    console.log('快捷键: 切换视图模式', mode);
    const sceneList = document.getElementById('sceneList');
    if (sceneList) {
      if (mode === 1) {
        sceneList.classList.remove('grid-view');
      } else if (mode === 2) {
        sceneList.classList.add('grid-view');
      }
    }
  }

  // ==================== 辅助函数 ====================

  /**
   * 显示快捷键面板
   */
  showShortcutsPanel() {
    const shortcuts = this.getShortcutList();
    const html = `
      <div class="shortcuts-panel" id="shortcutsPanel">
        <div class="shortcuts-content">
          <div class="shortcuts-header">
            <h3>⌨️ 键盘快捷键</h3>
            <button class="btn-icon" onclick="document.getElementById('shortcutsPanel').remove()">✕</button>
          </div>
          <div class="shortcuts-body">
            ${shortcuts.map(s => `
              <div class="shortcut-item">
                <kbd class="shortcut-key">${s.key}</kbd>
                <span class="shortcut-desc">${s.description}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    
    // 移除旧面板
    const oldPanel = document.getElementById('shortcutsPanel');
    if (oldPanel) oldPanel.remove();
    
    // 添加新面板
    document.body.insertAdjacentHTML('beforeend', html);
    
    // 添加样式（如果还没有）
    if (!document.getElementById('shortcuts-styles')) {
      const style = document.createElement('style');
      style.id = 'shortcuts-styles';
      style.textContent = `
        .shortcuts-panel {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          animation: fadeIn 0.2s;
        }
        
        .shortcuts-content {
          background: white;
          border-radius: 12px;
          max-width: 600px;
          max-height: 80vh;
          width: 90%;
          box-shadow: 0 8px 24px rgba(0,0,0,0.2);
          overflow: hidden;
        }
        
        .shortcuts-header {
          padding: 20px;
          border-bottom: 1px solid #e8e8e8;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .shortcuts-header h3 {
          margin: 0;
          font-size: 18px;
          color: #262626;
        }
        
        .shortcuts-body {
          padding: 20px;
          max-height: calc(80vh - 80px);
          overflow-y: auto;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 12px;
        }
        
        .shortcut-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px;
          border-radius: 6px;
          transition: background 0.2s;
        }
        
        .shortcut-item:hover {
          background: #f5f5f5;
        }
        
        .shortcut-key {
          background: #f0f0f0;
          border: 1px solid #d9d9d9;
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 12px;
          font-family: monospace;
          min-width: 80px;
          text-align: center;
          box-shadow: 0 2px 0 rgba(0,0,0,0.05);
        }
        
        .shortcut-desc {
          font-size: 13px;
          color: #595959;
          flex: 1;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * 显示提示消息
   * @param {string} message - 消息内容
   * @param {number} duration - 显示时长（毫秒）
   */
  showToast(message, duration = 2000) {
    const toast = document.createElement('div');
    toast.className = 'keyboard-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 14px;
      z-index: 10001;
      animation: slideUp 0.3s;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideDown 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, duration);
    
    // 添加动画样式
    if (!document.getElementById('toast-animation')) {
      const style = document.createElement('style');
      style.id = 'toast-animation';
      style.textContent = `
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translate(-50%, 20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        @keyframes slideDown {
          from {
            opacity: 1;
            transform: translate(-50%, 0);
          }
          to {
            opacity: 0;
            transform: translate(-50%, 20px);
          }
        }
      `;
      document.head.appendChild(style);
    }
  }
}

// 全局实例
window.keyboardShortcuts = new KeyboardShortcuts();
