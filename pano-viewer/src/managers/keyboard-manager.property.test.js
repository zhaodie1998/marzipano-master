/**
 * KeyboardManager 属性测试
 * **Feature: pano-viewer-optimization, Property 11: Input Focus Ignores Shortcuts**
 * **Validates: Requirements 5.8**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { KeyboardManager } from './keyboard-manager.js';

describe('KeyboardManager Property Tests', () => {
  let keyboardManager;

  beforeEach(() => {
    keyboardManager = new KeyboardManager();
  });

  afterEach(() => {
    keyboardManager.destroy();
  });

  /**
   * **Feature: pano-viewer-optimization, Property 11: Input Focus Ignores Shortcuts**
   * **Validates: Requirements 5.8**
   * 
   * For any keyboard event that occurs while an input element is focused,
   * KeyboardManager SHALL not trigger any registered shortcut handlers.
   */
  it('should not trigger shortcuts when input is focused', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('input', 'textarea'),
        fc.char(),
        (elementType, key) => {
          const handler = vi.fn();
          keyboardManager.register(key.toUpperCase(), handler);
          
          // 创建并聚焦输入元素
          const element = document.createElement(elementType);
          document.body.appendChild(element);
          element.focus();
          
          // 模拟键盘事件
          const event = new KeyboardEvent('keydown', { key });
          document.dispatchEvent(event);
          
          // 清理
          document.body.removeChild(element);
          keyboardManager.unregister(key.toUpperCase());
          
          // 当输入框聚焦时，处理器不应被调用
          expect(handler).not.toHaveBeenCalled();
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * 属性测试：快捷键注册的一致性
   */
  it('registered shortcuts should be retrievable', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            key: fc.stringOf(fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F'), { minLength: 1, maxLength: 1 }),
            description: fc.string({ minLength: 0, maxLength: 20 })
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (shortcuts) => {
          // 清除之前的快捷键
          keyboardManager.shortcuts.clear();
          keyboardManager.descriptions.clear();
          
          // 注册快捷键
          shortcuts.forEach(({ key, description }) => {
            keyboardManager.register(key, () => {}, description);
          });
          
          // 获取所有快捷键
          const all = keyboardManager.getAll();
          
          // 每个注册的快捷键都应该可以获取到
          shortcuts.forEach(({ key }) => {
            const normalizedKey = key.toUpperCase();
            expect(all.some(s => s.key === normalizedKey)).toBe(true);
          });
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * 属性测试：键名标准化的一致性
   */
  it('key normalization should be deterministic', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('ctrl', 'CTRL', 'Ctrl', 'alt', 'ALT', 'shift', 'SHIFT'), { minLength: 0, maxLength: 3 }),
        fc.char(),
        (modifiers, key) => {
          const keyString = [...modifiers, key].join('+');
          
          const normalized1 = keyboardManager._normalizeKey(keyString);
          const normalized2 = keyboardManager._normalizeKey(keyString);
          
          // 标准化应该是确定性的
          expect(normalized1).toBe(normalized2);
          
          // 结果应该是大写的
          expect(normalized1).toBe(normalized1.toUpperCase());
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
