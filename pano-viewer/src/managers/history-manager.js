/**
 * 历史管理器 - 实现撤销/重做功能
 */

class HistoryManager {
  constructor(maxSize = 50) {
    this.history = [];
    this.currentIndex = -1;
    this.maxSize = maxSize;
    this.listeners = [];
  }

  /**
   * 执行操作并记录
   */
  execute(action) {
    // 执行操作
    const result = action.execute();

    // 清除当前位置之后的历史
    this.history = this.history.slice(0, this.currentIndex + 1);

    // 添加新操作
    this.history.push(action);
    this.currentIndex++;

    // 限制历史大小
    if (this.history.length > this.maxSize) {
      this.history.shift();
      this.currentIndex--;
    }

    this._notifyListeners();
    return result;
  }

  /**
   * 撤销
   */
  undo() {
    if (!this.canUndo()) return false;

    const action = this.history[this.currentIndex];
    action.undo();
    this.currentIndex--;

    this._notifyListeners();
    return true;
  }

  /**
   * 重做
   */
  redo() {
    if (!this.canRedo()) return false;

    this.currentIndex++;
    const action = this.history[this.currentIndex];
    action.redo();

    this._notifyListeners();
    return true;
  }

  /**
   * 是否可以撤销
   */
  canUndo() {
    return this.currentIndex >= 0;
  }

  /**
   * 是否可以重做
   */
  canRedo() {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * 清空历史
   */
  clear() {
    this.history = [];
    this.currentIndex = -1;
    this._notifyListeners();
  }

  /**
   * 获取历史信息
   */
  getInfo() {
    return {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      historySize: this.history.length,
      currentIndex: this.currentIndex
    };
  }

  /**
   * 添加监听器
   */
  addListener(callback) {
    this.listeners.push(callback);
  }

  /**
   * 移除监听器
   */
  removeListener(callback) {
    const index = this.listeners.indexOf(callback);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 通知监听器
   */
  _notifyListeners() {
    const info = this.getInfo();
    this.listeners.forEach(callback => {
      try {
        callback(info);
      } catch (error) {
        console.error('HistoryManager: Error in listener', error);
      }
    });
  }
}

/**
 * 操作基类
 */
class Action {
  constructor(name) {
    this.name = name;
  }

  execute() {
    throw new Error('execute() must be implemented');
  }

  undo() {
    throw new Error('undo() must be implemented');
  }

  redo() {
    return this.execute();
  }
}

/**
 * 添加场景操作
 */
class AddSceneAction extends Action {
  constructor(sceneManager, sceneData) {
    super('添加场景');
    this.sceneManager = sceneManager;
    this.sceneData = sceneData;
    this.sceneId = null;
  }

  execute() {
    this.sceneId = this.sceneManager.addScene(this.sceneData);
    return this.sceneId;
  }

  undo() {
    this.sceneManager.removeScene(this.sceneId);
  }
}

/**
 * 删除场景操作
 */
class DeleteSceneAction extends Action {
  constructor(sceneManager, sceneId) {
    super('删除场景');
    this.sceneManager = sceneManager;
    this.sceneId = sceneId;
    this.sceneData = null;
  }

  execute() {
    this.sceneData = this.sceneManager.getScene(this.sceneId);
    this.sceneManager.removeScene(this.sceneId);
  }

  undo() {
    this.sceneManager.addScene(this.sceneData);
  }
}

export { HistoryManager, Action, AddSceneAction, DeleteSceneAction };
