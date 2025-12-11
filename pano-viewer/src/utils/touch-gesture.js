/**
 * 触摸手势管理器
 * 支持单指拖动、双指缩放、双击、长按等手势
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

class TouchGestureManager {
  constructor(element, options = {}) {
    this.element = element;
    this.options = {
      enableDrag: true,
      enablePinch: true,
      enableDoubleTap: true,
      enableLongPress: true,
      enableInertia: true,
      longPressDelay: 500,
      doubleTapDelay: 300,
      inertiaFriction: 0.95,
      ...options
    };

    this.handlers = {
      onDrag: null,
      onPinch: null,
      onDoubleTap: null,
      onLongPress: null,
      onInertia: null
    };

    this._state = {
      touching: false,
      startX: 0,
      startY: 0,
      lastX: 0,
      lastY: 0,
      velocityX: 0,
      velocityY: 0,
      lastTime: 0,
      lastTapTime: 0,
      longPressTimer: null,
      inertiaFrame: null,
      initialDistance: 0,
      initialScale: 1
    };

    this._bindEvents();
  }

  /**
   * 绑定事件处理器
   */
  on(event, handler) {
    if (this.handlers.hasOwnProperty(event)) {
      this.handlers[event] = handler;
    }
    return this;
  }

  /**
   * 绑定触摸事件
   */
  _bindEvents() {
    this._onTouchStart = this._handleTouchStart.bind(this);
    this._onTouchMove = this._handleTouchMove.bind(this);
    this._onTouchEnd = this._handleTouchEnd.bind(this);

    this.element.addEventListener('touchstart', this._onTouchStart, { passive: false });
    this.element.addEventListener('touchmove', this._onTouchMove, { passive: false });
    this.element.addEventListener('touchend', this._onTouchEnd, { passive: false });
    this.element.addEventListener('touchcancel', this._onTouchEnd, { passive: false });
  }

  /**
   * 处理触摸开始
   */
  _handleTouchStart(e) {
    const touches = e.touches;
    this._state.touching = true;
    this._state.lastTime = Date.now();

    // 取消惯性动画
    if (this._state.inertiaFrame) {
      cancelAnimationFrame(this._state.inertiaFrame);
      this._state.inertiaFrame = null;
    }

    if (touches.length === 1) {
      // 单指触摸
      const touch = touches[0];
      this._state.startX = touch.clientX;
      this._state.startY = touch.clientY;
      this._state.lastX = touch.clientX;
      this._state.lastY = touch.clientY;
      this._state.velocityX = 0;
      this._state.velocityY = 0;

      // 检测双击
      if (this.options.enableDoubleTap) {
        const now = Date.now();
        if (now - this._state.lastTapTime < this.options.doubleTapDelay) {
          this._handleDoubleTap(touch.clientX, touch.clientY);
          this._state.lastTapTime = 0;
          return;
        }
        this._state.lastTapTime = now;
      }

      // 启动长按检测
      if (this.options.enableLongPress) {
        this._state.longPressTimer = setTimeout(() => {
          this._handleLongPress(touch.clientX, touch.clientY);
        }, this.options.longPressDelay);
      }
    } else if (touches.length === 2 && this.options.enablePinch) {
      // 双指触摸 - 准备缩放
      this._state.initialDistance = this._getDistance(touches[0], touches[1]);
      this._state.initialScale = 1;
      this._clearLongPressTimer();
    }
  }

  /**
   * 处理触摸移动
   */
  _handleTouchMove(e) {
    if (!this._state.touching) return;

    const touches = e.touches;
    const now = Date.now();
    const dt = now - this._state.lastTime;

    if (touches.length === 1 && this.options.enableDrag) {
      // 单指拖动
      const touch = touches[0];
      const deltaX = touch.clientX - this._state.lastX;
      const deltaY = touch.clientY - this._state.lastY;

      // 计算速度（用于惯性）
      if (dt > 0) {
        this._state.velocityX = deltaX / dt * 16; // 归一化到 ~60fps
        this._state.velocityY = deltaY / dt * 16;
      }

      if (this.handlers.onDrag) {
        this.handlers.onDrag({
          deltaX,
          deltaY,
          clientX: touch.clientX,
          clientY: touch.clientY,
          originalEvent: e
        });
      }

      this._state.lastX = touch.clientX;
      this._state.lastY = touch.clientY;
      this._clearLongPressTimer();
      e.preventDefault();
    } else if (touches.length === 2 && this.options.enablePinch) {
      // 双指缩放
      const distance = this._getDistance(touches[0], touches[1]);
      const scale = distance / this._state.initialDistance;
      const center = this._getCenter(touches[0], touches[1]);

      if (this.handlers.onPinch) {
        this.handlers.onPinch({
          scale,
          centerX: center.x,
          centerY: center.y,
          originalEvent: e
        });
      }

      e.preventDefault();
    }

    this._state.lastTime = now;
  }

  /**
   * 处理触摸结束
   */
  _handleTouchEnd(e) {
    this._state.touching = false;
    this._clearLongPressTimer();

    // 启动惯性滚动
    if (this.options.enableInertia && 
        (Math.abs(this._state.velocityX) > 0.5 || Math.abs(this._state.velocityY) > 0.5)) {
      this._startInertia();
    }
  }

  /**
   * 处理双击
   */
  _handleDoubleTap(x, y) {
    if (this.handlers.onDoubleTap) {
      this.handlers.onDoubleTap({ clientX: x, clientY: y });
    }
  }

  /**
   * 处理长按
   */
  _handleLongPress(x, y) {
    if (this.handlers.onLongPress) {
      this.handlers.onLongPress({ clientX: x, clientY: y });
    }
  }

  /**
   * 启动惯性滚动
   */
  _startInertia() {
    const animate = () => {
      this._state.velocityX *= this.options.inertiaFriction;
      this._state.velocityY *= this.options.inertiaFriction;

      if (Math.abs(this._state.velocityX) < 0.1 && Math.abs(this._state.velocityY) < 0.1) {
        this._state.inertiaFrame = null;
        return;
      }

      if (this.handlers.onInertia) {
        this.handlers.onInertia({
          deltaX: this._state.velocityX,
          deltaY: this._state.velocityY
        });
      }

      this._state.inertiaFrame = requestAnimationFrame(animate);
    };

    this._state.inertiaFrame = requestAnimationFrame(animate);
  }

  /**
   * 计算两点距离
   */
  _getDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 计算两点中心
   */
  _getCenter(touch1, touch2) {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  }

  /**
   * 清除长按计时器
   */
  _clearLongPressTimer() {
    if (this._state.longPressTimer) {
      clearTimeout(this._state.longPressTimer);
      this._state.longPressTimer = null;
    }
  }

  /**
   * 销毁
   */
  destroy() {
    this._clearLongPressTimer();
    if (this._state.inertiaFrame) {
      cancelAnimationFrame(this._state.inertiaFrame);
    }

    this.element.removeEventListener('touchstart', this._onTouchStart);
    this.element.removeEventListener('touchmove', this._onTouchMove);
    this.element.removeEventListener('touchend', this._onTouchEnd);
    this.element.removeEventListener('touchcancel', this._onTouchEnd);
  }
}

export default TouchGestureManager;
