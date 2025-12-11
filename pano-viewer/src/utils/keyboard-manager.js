/**
 * 键盘快捷键管理器
 */

class KeyboardManager {
  constructor() {
    this.shortcuts = new Map();
    this.enabled = true;
    this._init();
  }

  /**
   * 初始化
   */
  _init() {
    document.addEventListener('keydown', (e) => {
      if (!this.enabled) return;

      const key = this._getKeyString(e);
      const handler = this.shortcuts.get(key);

      if (handler) {
        e.preventDefault();
        handler(e);
      }
    });
  }

  /**
   * 注册快捷键
   */
  register(key, handler, description = '') {
    const keyString = this._normalizeKey(key);
    this.shortcuts.set(keyString, handler);
    
    // 保存描述用于帮助文档
    if (!this.descriptions) {
      this.descriptions = new Map();
    }
    this.descriptions.set(keyString, description);
  }

  /**
   * 注销快捷键
   */
  unregister(key) {
    const keyString = this._normalizeKey(key);
    this.shortcuts.delete(keyString);
    if (this.descriptions) {
      this.descriptions.delete(keyString);
    }
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
        description: this.descriptions?.get(key) || ''
      });
    });
    return result;
  }

  /**
   * 获取按键字符串
   */
  _getKeyString(event) {
    const parts = [];
    
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
    if (event.metaKey) parts.push('Meta');
    
    const key = event.key.toUpperCase();
    if (key !== 'CONTROL' && key !== 'ALT' && key !== 'SHIFT' && key !== 'META') {
      parts.push(key);
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
