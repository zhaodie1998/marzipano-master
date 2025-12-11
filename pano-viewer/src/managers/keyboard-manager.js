/**
 * 键盘快捷键管理器
 */

class KeyboardManager {
  constructor() {
    this.shortcuts = new Map();
    this.descriptions = new Map();
    this.enabled = true;
    this._boundHandler = this._handleKeydown.bind(this);
    this._init();
  }

  /**
   * 初始化
   */
  _init() {
    document.addEventListener('keydown', this._boundHandler);
  }

  /**
   * 销毁
   */
  destroy() {
    document.removeEventListener('keydown', this._boundHandler);
  }

  /**
   * 处理键盘事件
   */
  _handleKeydown(e) {
    if (!this.enabled) return;
    
    // 检查是否在输入框中
    if (this.isInputFocused()) return;

    const key = this._getKeyString(e);
    const handler = this.shortcuts.get(key);

    if (handler) {
      e.preventDefault();
      handler(e);
    }
  }

  /**
   * 检查是否在输入状态
   */
  isInputFocused() {
    const activeElement = document.activeElement;
    if (!activeElement) return false;
    
    const tagName = activeElement.tagName ? activeElement.tagName.toUpperCase() : '';
    if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
      return true;
    }
    if (activeElement.isContentEditable) {
      return true;
    }
    return false;
  }

  /**
   * 注册快捷键
   */
  register(key, handler, description = '') {
    const keyString = this._normalizeKey(key);
    this.shortcuts.set(keyString, handler);
    this.descriptions.set(keyString, description);
  }

  /**
   * 注销快捷键
   */
  unregister(key) {
    const keyString = this._normalizeKey(key);
    this.shortcuts.delete(keyString);
    this.descriptions.delete(keyString);
  }

  /**
   * 启用/禁用
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * 获取所有快捷键
   */
  getAll() {
    const result = [];
    this.shortcuts.forEach((handler, key) => {
      result.push({
        key,
        description: this.descriptions.get(key) || ''
      });
    });
    return result;
  }

  /**
   * 获取按键字符串
   */
  _getKeyString(event) {
    const parts = [];
    
    if (event.ctrlKey || event.metaKey) parts.push('CTRL');
    if (event.altKey) parts.push('ALT');
    if (event.shiftKey) parts.push('SHIFT');
    
    const key = event.key.toUpperCase();
    if (!['CONTROL', 'ALT', 'SHIFT', 'META'].includes(key)) {
      // 处理特殊键
      if (key === ' ') {
        parts.push('SPACE');
      } else if (key === 'ARROWLEFT') {
        parts.push('LEFT');
      } else if (key === 'ARROWRIGHT') {
        parts.push('RIGHT');
      } else if (key === 'ARROWUP') {
        parts.push('UP');
      } else if (key === 'ARROWDOWN') {
        parts.push('DOWN');
      } else {
        parts.push(key);
      }
    }
    
    return parts.join('+');
  }

  /**
   * 标准化按键字符串
   */
  _normalizeKey(key) {
    return key.split('+').map(k => k.trim().toUpperCase()).join('+');
  }
}

export default new KeyboardManager();

// 导出类以便测试
export { KeyboardManager };
