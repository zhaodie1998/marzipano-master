/**
 * KeyboardManager 单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { KeyboardManager } from './keyboard-manager.js';

describe('KeyboardManager', () => {
  let keyboardManager;

  beforeEach(() => {
    keyboardManager = new KeyboardManager();
  });

  afterEach(() => {
    keyboardManager.destroy();
  });

  describe('register/unregister', () => {
    it('should register shortcut', () => {
      const handler = vi.fn();
      keyboardManager.register('Ctrl+S', handler, 'Save');
      
      expect(keyboardManager.shortcuts.has('CTRL+S')).toBe(true);
    });

    it('should unregister shortcut', () => {
      const handler = vi.fn();
      keyboardManager.register('Ctrl+S', handler);
      keyboardManager.unregister('Ctrl+S');
      
      expect(keyboardManager.shortcuts.has('CTRL+S')).toBe(false);
    });
  });

  describe('getAll', () => {
    it('should return all registered shortcuts', () => {
      keyboardManager.register('Ctrl+S', () => {}, 'Save');
      keyboardManager.register('Ctrl+Z', () => {}, 'Undo');
      
      const all = keyboardManager.getAll();
      
      expect(all.length).toBe(2);
      expect(all.some(s => s.key === 'CTRL+S')).toBe(true);
      expect(all.some(s => s.key === 'CTRL+Z')).toBe(true);
    });
  });

  describe('setEnabled', () => {
    it('should enable/disable keyboard handling', () => {
      keyboardManager.setEnabled(false);
      expect(keyboardManager.enabled).toBe(false);
      
      keyboardManager.setEnabled(true);
      expect(keyboardManager.enabled).toBe(true);
    });
  });

  describe('isInputFocused', () => {
    it('should return false when no element is focused', () => {
      expect(keyboardManager.isInputFocused()).toBe(false);
    });

    it('should return true when input is focused', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();
      
      expect(keyboardManager.isInputFocused()).toBe(true);
      
      document.body.removeChild(input);
    });

    it('should return true when textarea is focused', () => {
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      textarea.focus();
      
      expect(keyboardManager.isInputFocused()).toBe(true);
      
      document.body.removeChild(textarea);
    });
  });

  describe('_normalizeKey', () => {
    it('should normalize key string to uppercase', () => {
      expect(keyboardManager._normalizeKey('ctrl+s')).toBe('CTRL+S');
      expect(keyboardManager._normalizeKey('Ctrl + Z')).toBe('CTRL+Z');
    });
  });

  describe('_getKeyString', () => {
    it('should handle simple key', () => {
      const event = { key: 'a', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false };
      expect(keyboardManager._getKeyString(event)).toBe('A');
    });

    it('should handle Ctrl modifier', () => {
      const event = { key: 's', ctrlKey: true, altKey: false, shiftKey: false, metaKey: false };
      expect(keyboardManager._getKeyString(event)).toBe('CTRL+S');
    });

    it('should handle multiple modifiers', () => {
      const event = { key: 's', ctrlKey: true, altKey: true, shiftKey: false, metaKey: false };
      expect(keyboardManager._getKeyString(event)).toBe('CTRL+ALT+S');
    });

    it('should handle space key', () => {
      const event = { key: ' ', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false };
      expect(keyboardManager._getKeyString(event)).toBe('SPACE');
    });

    it('should handle arrow keys', () => {
      const event = { key: 'ArrowLeft', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false };
      expect(keyboardManager._getKeyString(event)).toBe('LEFT');
    });
  });

  describe('keyboard event handling', () => {
    it('should call handler when shortcut is pressed', () => {
      const handler = vi.fn();
      keyboardManager.register('A', handler);
      
      const event = new KeyboardEvent('keydown', { key: 'a' });
      document.dispatchEvent(event);
      
      expect(handler).toHaveBeenCalled();
    });

    it('should not call handler when disabled', () => {
      const handler = vi.fn();
      keyboardManager.register('A', handler);
      keyboardManager.setEnabled(false);
      
      const event = new KeyboardEvent('keydown', { key: 'a' });
      document.dispatchEvent(event);
      
      expect(handler).not.toHaveBeenCalled();
    });

    it('should not call handler when input is focused', () => {
      const handler = vi.fn();
      keyboardManager.register('A', handler);
      
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();
      
      const event = new KeyboardEvent('keydown', { key: 'a' });
      document.dispatchEvent(event);
      
      expect(handler).not.toHaveBeenCalled();
      
      document.body.removeChild(input);
    });
  });

  describe('shortcut registration - Requirements 5.1-5.9', () => {
    it('should register Space key for auto-rotate toggle (Req 5.1)', () => {
      const handler = vi.fn();
      keyboardManager.register('Space', handler, 'Toggle auto-rotate');
      
      const event = new KeyboardEvent('keydown', { key: ' ' });
      document.dispatchEvent(event);
      
      expect(handler).toHaveBeenCalled();
    });

    it('should register F key for fullscreen toggle (Req 5.2)', () => {
      const handler = vi.fn();
      keyboardManager.register('F', handler, 'Toggle fullscreen');
      
      const event = new KeyboardEvent('keydown', { key: 'f' });
      document.dispatchEvent(event);
      
      expect(handler).toHaveBeenCalled();
    });

    it('should register H key for hotspot toggle (Req 5.3)', () => {
      const handler = vi.fn();
      keyboardManager.register('H', handler, 'Toggle hotspots');
      
      const event = new KeyboardEvent('keydown', { key: 'h' });
      document.dispatchEvent(event);
      
      expect(handler).toHaveBeenCalled();
    });

    it('should register Ctrl+S for save (Req 5.4)', () => {
      const handler = vi.fn();
      keyboardManager.register('Ctrl+S', handler, 'Save project');
      
      const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true });
      document.dispatchEvent(event);
      
      expect(handler).toHaveBeenCalled();
    });

    it('should register Ctrl+E for export (Req 5.5)', () => {
      const handler = vi.fn();
      keyboardManager.register('Ctrl+E', handler, 'Export project');
      
      const event = new KeyboardEvent('keydown', { key: 'e', ctrlKey: true });
      document.dispatchEvent(event);
      
      expect(handler).toHaveBeenCalled();
    });

    it('should register Delete key (Req 5.6)', () => {
      const handler = vi.fn();
      keyboardManager.register('Delete', handler, 'Delete selected');
      
      const event = new KeyboardEvent('keydown', { key: 'Delete' });
      document.dispatchEvent(event);
      
      expect(handler).toHaveBeenCalled();
    });

    it('should register arrow keys for scene navigation (Req 5.7)', () => {
      const leftHandler = vi.fn();
      const rightHandler = vi.fn();
      
      keyboardManager.register('Left', leftHandler, 'Previous scene');
      keyboardManager.register('Right', rightHandler, 'Next scene');
      
      const leftEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      document.dispatchEvent(leftEvent);
      expect(leftHandler).toHaveBeenCalled();
      
      const rightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      document.dispatchEvent(rightEvent);
      expect(rightHandler).toHaveBeenCalled();
    });

    it('should register ? key for help panel (Req 5.9)', () => {
      const handler = vi.fn();
      keyboardManager.register('?', handler, 'Show help');
      
      const event = new KeyboardEvent('keydown', { key: '?' });
      document.dispatchEvent(event);
      
      expect(handler).toHaveBeenCalled();
    });

    it('should register Ctrl+Z for undo', () => {
      const handler = vi.fn();
      keyboardManager.register('Ctrl+Z', handler, 'Undo');
      
      const event = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true });
      document.dispatchEvent(event);
      
      expect(handler).toHaveBeenCalled();
    });

    it('should register Ctrl+Y for redo', () => {
      const handler = vi.fn();
      keyboardManager.register('Ctrl+Y', handler, 'Redo');
      
      const event = new KeyboardEvent('keydown', { key: 'y', ctrlKey: true });
      document.dispatchEvent(event);
      
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('modifier key combinations', () => {
    it('should handle Ctrl modifier', () => {
      const handler = vi.fn();
      keyboardManager.register('Ctrl+A', handler);
      
      const event = new KeyboardEvent('keydown', { key: 'a', ctrlKey: true });
      document.dispatchEvent(event);
      
      expect(handler).toHaveBeenCalled();
    });

    it('should handle Alt modifier', () => {
      const handler = vi.fn();
      keyboardManager.register('Alt+A', handler);
      
      const event = new KeyboardEvent('keydown', { key: 'a', altKey: true });
      document.dispatchEvent(event);
      
      expect(handler).toHaveBeenCalled();
    });

    it('should handle Shift modifier', () => {
      const handler = vi.fn();
      keyboardManager.register('Shift+A', handler);
      
      const event = new KeyboardEvent('keydown', { key: 'a', shiftKey: true });
      document.dispatchEvent(event);
      
      expect(handler).toHaveBeenCalled();
    });

    it('should handle Ctrl+Alt combination', () => {
      const handler = vi.fn();
      keyboardManager.register('Ctrl+Alt+A', handler);
      
      const event = new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, altKey: true });
      document.dispatchEvent(event);
      
      expect(handler).toHaveBeenCalled();
    });

    it('should handle Ctrl+Shift combination', () => {
      const handler = vi.fn();
      keyboardManager.register('Ctrl+Shift+A', handler);
      
      const event = new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, shiftKey: true });
      document.dispatchEvent(event);
      
      expect(handler).toHaveBeenCalled();
    });

    it('should handle Ctrl+Alt+Shift combination', () => {
      const handler = vi.fn();
      keyboardManager.register('Ctrl+Alt+Shift+A', handler);
      
      const event = new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, altKey: true, shiftKey: true });
      document.dispatchEvent(event);
      
      expect(handler).toHaveBeenCalled();
    });

    it('should distinguish between modified and unmodified keys', () => {
      const plainHandler = vi.fn();
      const ctrlHandler = vi.fn();
      
      keyboardManager.register('A', plainHandler);
      keyboardManager.register('Ctrl+A', ctrlHandler);
      
      // Plain key press
      const plainEvent = new KeyboardEvent('keydown', { key: 'a' });
      document.dispatchEvent(plainEvent);
      expect(plainHandler).toHaveBeenCalledTimes(1);
      expect(ctrlHandler).not.toHaveBeenCalled();
      
      // Ctrl+A press
      const ctrlEvent = new KeyboardEvent('keydown', { key: 'a', ctrlKey: true });
      document.dispatchEvent(ctrlEvent);
      expect(plainHandler).toHaveBeenCalledTimes(1);
      expect(ctrlHandler).toHaveBeenCalledTimes(1);
    });

    it('should handle Meta key as Ctrl on Mac', () => {
      const handler = vi.fn();
      keyboardManager.register('Ctrl+S', handler);
      
      const event = new KeyboardEvent('keydown', { key: 's', metaKey: true });
      document.dispatchEvent(event);
      
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('special keys', () => {
    it('should handle Space key', () => {
      const handler = vi.fn();
      keyboardManager.register('Space', handler);
      
      const event = new KeyboardEvent('keydown', { key: ' ' });
      document.dispatchEvent(event);
      
      expect(handler).toHaveBeenCalled();
    });

    it('should handle arrow keys', () => {
      const upHandler = vi.fn();
      const downHandler = vi.fn();
      const leftHandler = vi.fn();
      const rightHandler = vi.fn();
      
      keyboardManager.register('Up', upHandler);
      keyboardManager.register('Down', downHandler);
      keyboardManager.register('Left', leftHandler);
      keyboardManager.register('Right', rightHandler);
      
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
      expect(upHandler).toHaveBeenCalled();
      
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      expect(downHandler).toHaveBeenCalled();
      
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
      expect(leftHandler).toHaveBeenCalled();
      
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      expect(rightHandler).toHaveBeenCalled();
    });

    it('should handle Delete key', () => {
      const handler = vi.fn();
      keyboardManager.register('Delete', handler);
      
      const event = new KeyboardEvent('keydown', { key: 'Delete' });
      document.dispatchEvent(event);
      
      expect(handler).toHaveBeenCalled();
    });

    it('should handle Escape key', () => {
      const handler = vi.fn();
      keyboardManager.register('Escape', handler);
      
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);
      
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('event prevention', () => {
    it('should prevent default behavior when shortcut is triggered', () => {
      const handler = vi.fn();
      keyboardManager.register('Ctrl+S', handler);
      
      const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      
      document.dispatchEvent(event);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should not prevent default when no shortcut matches', () => {
      const event = new KeyboardEvent('keydown', { key: 'x', cancelable: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      
      document.dispatchEvent(event);
      
      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });
  });
});
