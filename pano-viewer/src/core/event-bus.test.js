/**
 * EventBus 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from './event-bus.js';

describe('EventBus', () => {
  let eventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe('on/emit', () => {
    it('should call handler when event is emitted', () => {
      const handler = vi.fn();
      eventBus.on('test', handler);
      eventBus.emit('test', { data: 'value' });
      
      expect(handler).toHaveBeenCalledWith({ data: 'value' });
    });

    it('should call multiple handlers for same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      eventBus.on('test', handler1);
      eventBus.on('test', handler2);
      eventBus.emit('test', 'data');
      
      expect(handler1).toHaveBeenCalledWith('data');
      expect(handler2).toHaveBeenCalledWith('data');
    });

    it('should not throw when emitting event with no handlers', () => {
      expect(() => eventBus.emit('nonexistent')).not.toThrow();
    });
  });

  describe('off', () => {
    it('should remove handler', () => {
      const handler = vi.fn();
      eventBus.on('test', handler);
      eventBus.off('test', handler);
      eventBus.emit('test');
      
      expect(handler).not.toHaveBeenCalled();
    });

    it('should only remove specified handler', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      eventBus.on('test', handler1);
      eventBus.on('test', handler2);
      eventBus.off('test', handler1);
      eventBus.emit('test');
      
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should not throw when removing non-existent handler', () => {
      expect(() => eventBus.off('test', () => {})).not.toThrow();
    });
  });

  describe('once', () => {
    it('should call handler only once', () => {
      const handler = vi.fn();
      eventBus.once('test', handler);
      
      eventBus.emit('test', 'first');
      eventBus.emit('test', 'second');
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('first');
    });
  });

  describe('clear', () => {
    it('should remove all handlers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      eventBus.on('event1', handler1);
      eventBus.on('event2', handler2);
      eventBus.clear();
      
      eventBus.emit('event1');
      eventBus.emit('event2');
      
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('listenerCount', () => {
    it('should return correct count', () => {
      expect(eventBus.listenerCount('test')).toBe(0);
      
      eventBus.on('test', () => {});
      expect(eventBus.listenerCount('test')).toBe(1);
      
      eventBus.on('test', () => {});
      expect(eventBus.listenerCount('test')).toBe(2);
    });
  });

  describe('error handling', () => {
    it('should continue calling handlers even if one throws', () => {
      const errorHandler = vi.fn(() => { throw new Error('test error'); });
      const normalHandler = vi.fn();
      
      // 捕获 console.error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      eventBus.on('test', errorHandler);
      eventBus.on('test', normalHandler);
      eventBus.emit('test');
      
      expect(normalHandler).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
