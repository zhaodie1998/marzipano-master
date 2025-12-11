/**
 * HistoryManager 属性测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { HistoryManager, Action } from './history-manager.js';

// 创建简单的测试 Action
class TestAction extends Action {
  constructor(value) {
    super(`Set value to ${value}`);
    this.value = value;
    this.previousValue = null;
    this.state = { value: 0 };
  }

  execute() {
    this.previousValue = this.state.value;
    this.state.value = this.value;
    return this.value;
  }

  undo() {
    this.state.value = this.previousValue;
  }

  redo() {
    this.state.value = this.value;
  }
}

// 创建带共享状态的 Action
const createActionWithState = (state) => {
  return class extends Action {
    constructor(value) {
      super(`Set to ${value}`);
      this.value = value;
      this.previousValue = null;
    }

    execute() {
      this.previousValue = state.value;
      state.value = this.value;
      return this.value;
    }

    undo() {
      state.value = this.previousValue;
    }

    redo() {
      state.value = this.value;
    }
  };
};

describe('HistoryManager Property Tests', () => {
  let historyManager;

  beforeEach(() => {
    historyManager = new HistoryManager(50);
  });

  /**
   * **Feature: pano-viewer-optimization, Property 5: History Recording**
   * **Validates: Requirements 4.1**
   * 
   * For any action executed through HistoryManager.execute(),
   * the history size SHALL increase by 1 (up to maxSize),
   * and canUndo() SHALL return true.
   */
  it('executing action should increase history size and enable undo', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -1000, max: 1000 }), { minLength: 1, maxLength: 30 }),
        (values) => {
          historyManager.clear();
          const state = { value: 0 };
          const ActionClass = createActionWithState(state);
          
          values.forEach((value, index) => {
            const sizeBefore = historyManager.history.length;
            historyManager.execute(new ActionClass(value));
            const sizeAfter = historyManager.history.length;
            
            // 历史大小应增加 1（除非达到 maxSize）
            if (sizeBefore < historyManager.maxSize) {
              expect(sizeAfter).toBe(sizeBefore + 1);
            } else {
              expect(sizeAfter).toBe(historyManager.maxSize);
            }
            
            // 执行后应该可以撤销
            expect(historyManager.canUndo()).toBe(true);
          });
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: pano-viewer-optimization, Property 6: Undo-Redo Round Trip**
   * **Validates: Requirements 4.2, 4.3**
   * 
   * For any sequence of actions executed through HistoryManager,
   * performing undo followed by redo SHALL restore the state
   * to what it was after the original action execution.
   */
  it('undo followed by redo should restore state', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -1000, max: 1000 }), { minLength: 1, maxLength: 20 }),
        (values) => {
          historyManager.clear();
          const state = { value: 0 };
          const ActionClass = createActionWithState(state);
          
          // 执行所有操作
          values.forEach(value => {
            historyManager.execute(new ActionClass(value));
          });
          
          const finalValue = state.value;
          
          // 撤销
          historyManager.undo();
          const afterUndo = state.value;
          
          // 重做
          historyManager.redo();
          const afterRedo = state.value;
          
          // 重做后应恢复到撤销前的状态
          expect(afterRedo).toBe(finalValue);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: pano-viewer-optimization, Property 7: Undo Boundary**
   * **Validates: Requirements 4.4**
   * 
   * For any HistoryManager with empty history or at the earliest state,
   * canUndo() SHALL return false.
   */
  it('canUndo should return false when at boundary', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 0, maxLength: 10 }),
        (values) => {
          historyManager.clear();
          const state = { value: 0 };
          const ActionClass = createActionWithState(state);
          
          // 空历史时不能撤销
          expect(historyManager.canUndo()).toBe(false);
          
          // 执行操作
          values.forEach(value => {
            historyManager.execute(new ActionClass(value));
          });
          
          // 撤销所有操作
          while (historyManager.canUndo()) {
            historyManager.undo();
          }
          
          // 到达最早状态后不能再撤销
          expect(historyManager.canUndo()).toBe(false);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: pano-viewer-optimization, Property 8: Redo Boundary**
   * **Validates: Requirements 4.5**
   * 
   * For any HistoryManager at the latest state,
   * canRedo() SHALL return false.
   */
  it('canRedo should return false when at latest state', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 0, maxLength: 10 }),
        (values) => {
          historyManager.clear();
          const state = { value: 0 };
          const ActionClass = createActionWithState(state);
          
          // 执行操作
          values.forEach(value => {
            historyManager.execute(new ActionClass(value));
          });
          
          // 在最新状态时不能重做
          expect(historyManager.canRedo()).toBe(false);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: pano-viewer-optimization, Property 9: New Action Clears Redo History**
   * **Validates: Requirements 4.6**
   * 
   * For any HistoryManager where undo has been performed,
   * executing a new action SHALL clear all history entries after the current position,
   * making canRedo() return false.
   */
  it('new action after undo should clear redo history', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 2, maxLength: 10 }),
        fc.integer({ min: -100, max: 100 }),
        (values, newValue) => {
          historyManager.clear();
          const state = { value: 0 };
          const ActionClass = createActionWithState(state);
          
          // 执行操作
          values.forEach(value => {
            historyManager.execute(new ActionClass(value));
          });
          
          // 撤销一次
          historyManager.undo();
          
          // 此时应该可以重做
          expect(historyManager.canRedo()).toBe(true);
          
          // 执行新操作
          historyManager.execute(new ActionClass(newValue));
          
          // 新操作后不能重做
          expect(historyManager.canRedo()).toBe(false);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: pano-viewer-optimization, Property 10: History Size Limit**
   * **Validates: Requirements 4.7**
   * 
   * For any sequence of actions executed through HistoryManager,
   * the history size SHALL never exceed maxSize.
   */
  it('history size should never exceed maxSize', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 1, maxLength: 50 }),
        (maxSize, values) => {
          const manager = new HistoryManager(maxSize);
          const state = { value: 0 };
          const ActionClass = createActionWithState(state);
          
          values.forEach(value => {
            manager.execute(new ActionClass(value));
            
            // 历史大小永远不应超过 maxSize
            expect(manager.history.length).toBeLessThanOrEqual(maxSize);
          });
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
