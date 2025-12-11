// 移动端适配脚本
// 提供完整的移动端触摸交互和响应式体验

(function() {
  'use strict';
  
  // 检测移动设备
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isTablet = /iPad|Android/i.test(navigator.userAgent) && window.innerWidth >= 768;
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);
  
  console.log('📱 移动端检测:', {
    isMobile,
    isTablet,
    isTouchDevice,
    isIOS,
    isAndroid,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    pixelRatio: window.devicePixelRatio
  });
  
  // 等待DOM加载
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  function init() {
    // 始终添加触摸设备类
    if (isTouchDevice) {
      document.body.classList.add('touch-device');
    }
    
    if (isMobile || isTouchDevice) {
      setupMobileUI();
      setupTouchGestures();
      setupMobileMenu();
      setupOrientationChange();
      optimizeMobilePerformance();
      addMobileStyles();
      setupPullToRefresh();
      fixIOSInputZoom();
      console.log('✅ 移动端适配已启用');
    }
  }
  
  // 修复 iOS 输入框缩放问题
  function fixIOSInputZoom() {
    if (!isIOS) return;
    
    // 防止输入框聚焦时页面缩放
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      input.style.fontSize = '16px'; // iOS 不会缩放 16px 及以上的输入框
    });
    
    // 监听新添加的输入框
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            const newInputs = node.querySelectorAll ? node.querySelectorAll('input, textarea, select') : [];
            newInputs.forEach(input => {
              input.style.fontSize = '16px';
            });
            if (node.matches && node.matches('input, textarea, select')) {
              node.style.fontSize = '16px';
            }
          }
        });
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
  }
  
  // 下拉刷新（可选功能）
  function setupPullToRefresh() {
    // 仅在特定页面启用
    if (!document.querySelector('.scene-list')) return;
    
    let startY = 0;
    let pulling = false;
    
    document.addEventListener('touchstart', (e) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        pulling = true;
      }
    }, { passive: true });
    
    document.addEventListener('touchmove', (e) => {
      if (!pulling) return;
      const currentY = e.touches[0].clientY;
      const diff = currentY - startY;
      
      if (diff > 80 && window.scrollY === 0) {
        showTouchHint('释放刷新');
      }
    }, { passive: true });
    
    document.addEventListener('touchend', () => {
      pulling = false;
    }, { passive: true });
  }
  
  // ==================== 移动端UI优化 ====================
  
  function setupMobileUI() {
    // 添加移动端类
    document.body.classList.add('mobile-device');
    if (isTablet) document.body.classList.add('tablet-device');
    
    // 优化视口
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover';
    
    // 防止双击缩放
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    }, { passive: false });
    
    // 创建移动端工具栏切换按钮
    createMobileToggle();
    
    // 优化侧边栏
    optimizeSidebar();
    
    // 优化顶部导航
    optimizeTopNav();
  }
  
  // 创建移动端菜单切换按钮
  function createMobileToggle() {
    const toggle = document.createElement('button');
    toggle.id = 'mobileMenuToggle';
    toggle.className = 'mobile-menu-toggle';
    toggle.setAttribute('aria-label', '打开菜单');
    toggle.innerHTML = `
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path fill="currentColor" d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
      </svg>
    `;
    
    toggle.addEventListener('click', toggleMobileSidebar);
    
    // 添加到导航栏
    const navLeft = document.querySelector('.nav-left');
    if (navLeft) {
      navLeft.insertBefore(toggle, navLeft.firstChild);
    }
  }
  
  // 切换移动端侧边栏
  function toggleMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('mobileOverlay') || createOverlay();
    const toggle = document.getElementById('mobileMenuToggle');
    
    if (sidebar.classList.contains('mobile-active')) {
      sidebar.classList.remove('mobile-active');
      overlay.classList.remove('active');
      toggle.setAttribute('aria-label', '打开菜单');
      document.body.style.overflow = '';
    } else {
      sidebar.classList.add('mobile-active');
      overlay.classList.add('active');
      toggle.setAttribute('aria-label', '关闭菜单');
      document.body.style.overflow = 'hidden';
    }
  }
  
  // 创建遮罩层
  function createOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'mobileOverlay';
    overlay.className = 'mobile-overlay';
    overlay.addEventListener('click', toggleMobileSidebar);
    document.body.appendChild(overlay);
    return overlay;
  }
  
  // 优化侧边栏
  function optimizeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    
    // 默认隐藏（移动端）
    if (window.innerWidth < 768) {
      sidebar.classList.add('mobile-hidden');
    }
    
    // 添加关闭按钮
    const closeBtn = document.createElement('button');
    closeBtn.className = 'sidebar-close-btn';
    closeBtn.innerHTML = '✕';
    closeBtn.setAttribute('aria-label', '关闭侧边栏');
    closeBtn.addEventListener('click', toggleMobileSidebar);
    
    const sidebarTabs = sidebar.querySelector('.sidebar-tabs');
    if (sidebarTabs) {
      sidebarTabs.insertBefore(closeBtn, sidebarTabs.firstChild);
    }
  }
  
  // 优化顶部导航
  function optimizeTopNav() {
    const navCenter = document.querySelector('.nav-center');
    if (!navCenter && window.innerWidth < 768) {
      // 移动端隐藏中央工具栏，通过侧边栏访问
      const controlBar = document.getElementById('controlBar');
      if (controlBar) {
        controlBar.style.display = 'none';
      }
    }
  }
  
  // ==================== 触摸手势支持 ====================
  
  function setupTouchGestures() {
    const viewer = document.getElementById('pano');
    if (!viewer) return;
    
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    
    // 触摸开始
    viewer.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
      }
    }, { passive: true });
    
    // 触摸结束 - 检测快速滑动
    viewer.addEventListener('touchend', (e) => {
      if (e.changedTouches.length === 1) {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const touchEndTime = Date.now();
        
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        const deltaTime = touchEndTime - touchStartTime;
        
        // 检测滑动手势
        if (deltaTime < 300 && Math.abs(deltaX) > 50 && Math.abs(deltaY) < 30) {
          if (deltaX > 0) {
            // 右滑 - 上一个场景
            switchToPreviousScene();
          } else {
            // 左滑 - 下一个场景
            switchToNextScene();
          }
        }
      }
    }, { passive: true });
    
    // 双指缩放提示
    let lastTouchCount = 0;
    viewer.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2 && lastTouchCount === 1) {
        showTouchHint('双指缩放');
      }
      lastTouchCount = e.touches.length;
    }, { passive: true });
  }
  
  // 切换到上一个场景
  function switchToPreviousScene() {
    if (!window.appState || !window.appState.scenes) return;
    
    const currentIndex = window.appState.scenes.findIndex(
      s => s.id === window.appState.currentScene?.id
    );
    
    if (currentIndex > 0) {
      const prevScene = window.appState.scenes[currentIndex - 1];
      if (window.switchScene) {
        window.switchScene(prevScene.id);
        showTouchHint('← 上一个场景');
      }
    }
  }
  
  // 切换到下一个场景
  function switchToNextScene() {
    if (!window.appState || !window.appState.scenes) return;
    
    const currentIndex = window.appState.scenes.findIndex(
      s => s.id === window.appState.currentScene?.id
    );
    
    if (currentIndex >= 0 && currentIndex < window.appState.scenes.length - 1) {
      const nextScene = window.appState.scenes[currentIndex + 1];
      if (window.switchScene) {
        window.switchScene(nextScene.id);
        showTouchHint('下一个场景 →');
      }
    }
  }
  
  // 显示触摸提示
  function showTouchHint(text) {
    let hint = document.getElementById('touchHint');
    if (!hint) {
      hint = document.createElement('div');
      hint.id = 'touchHint';
      hint.className = 'touch-hint';
      document.body.appendChild(hint);
    }
    
    hint.textContent = text;
    hint.classList.add('show');
    
    clearTimeout(hint.timeout);
    hint.timeout = setTimeout(() => {
      hint.classList.remove('show');
    }, 1500);
  }
  
  // ==================== 移动端菜单 ====================
  
  function setupMobileMenu() {
    // 创建底部操作栏
    createBottomBar();
    
    // 优化标签页
    optimizeTabs();
  }
  
  // 创建底部操作栏
  function createBottomBar() {
    if (window.innerWidth >= 768) return;
    
    const bottomBar = document.createElement('div');
    bottomBar.className = 'mobile-bottom-bar';
    bottomBar.innerHTML = `
      <button class="bottom-bar-btn" data-action="upload">
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/>
        </svg>
        <span>上传</span>
      </button>
      <button class="bottom-bar-btn" data-action="hotspot">
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
        <span>热点</span>
      </button>
      <button class="bottom-bar-btn" data-action="scenes">
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z"/>
        </svg>
        <span>场景</span>
      </button>
      <button class="bottom-bar-btn" data-action="settings">
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
        </svg>
        <span>设置</span>
      </button>
    `;
    
    // 添加点击事件
    bottomBar.querySelectorAll('.bottom-bar-btn').forEach(btn => {
      btn.addEventListener('click', handleBottomBarAction);
    });
    
    document.body.appendChild(bottomBar);
  }
  
  // 处理底部栏操作
  function handleBottomBarAction(e) {
    const action = e.currentTarget.dataset.action;
    const sidebar = document.querySelector('.sidebar');
    
    // 打开侧边栏并切换到相应标签
    if (!sidebar.classList.contains('mobile-active')) {
      toggleMobileSidebar();
    }
    
    // 切换标签
    const tabMap = {
      'upload': 'scenes',
      'hotspot': 'hotspots',
      'scenes': 'scenes',
      'settings': 'settings'
    };
    
    const targetTab = tabMap[action];
    if (targetTab) {
      const tabBtn = document.querySelector(`[data-tab="${targetTab}"]`);
      if (tabBtn) {
        tabBtn.click();
      }
    }
    
    // 特殊操作
    if (action === 'upload') {
      setTimeout(() => {
        const fileInput = document.getElementById('fileInput');
        if (fileInput) fileInput.click();
      }, 300);
    } else if (action === 'hotspot') {
      setTimeout(() => {
        const addHotspotBtn = document.getElementById('addHotspotBtn');
        if (addHotspotBtn) addHotspotBtn.click();
      }, 300);
    }
  }
  
  // 优化标签页
  function optimizeTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
      // 触摸反馈
      tab.addEventListener('touchstart', function() {
        this.style.transform = 'scale(0.95)';
      }, { passive: true });
      
      tab.addEventListener('touchend', function() {
        this.style.transform = '';
      }, { passive: true });
    });
  }
  
  // ==================== 屏幕方向变化 ====================
  
  function setupOrientationChange() {
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleResize);
  }
  
  function handleOrientationChange() {
    const orientation = window.orientation || screen.orientation?.angle || 0;
    
    setTimeout(() => {
      // 重新计算布局
      if (window.appState && window.appState.viewer) {
        window.appState.viewer.updateSize();
      }
      
      // 显示方向提示
      if (Math.abs(orientation) === 90) {
        showTouchHint('横屏模式');
      } else {
        showTouchHint('竖屏模式');
      }
    }, 100);
  }
  
  function handleResize() {
    // 防抖处理
    clearTimeout(handleResize.timeout);
    handleResize.timeout = setTimeout(() => {
      const width = window.innerWidth;
      
      // 切换移动/桌面模式
      if (width < 768) {
        document.body.classList.add('mobile-layout');
      } else {
        document.body.classList.remove('mobile-layout');
        // 关闭移动端侧边栏
        const sidebar = document.querySelector('.sidebar');
        if (sidebar && sidebar.classList.contains('mobile-active')) {
          toggleMobileSidebar();
        }
      }
      
      // 更新查看器尺寸
      if (window.appState && window.appState.viewer) {
        window.appState.viewer.updateSize();
      }
    }, 150);
  }
  
  // ==================== 性能优化 ====================
  
  function optimizeMobilePerformance() {
    // 禁用悬停效果（移动端不需要）
    const style = document.createElement('style');
    style.textContent = `
      @media (hover: none) {
        .tool-btn:hover,
        .icon-btn:hover,
        .scene-item:hover {
          background: transparent !important;
          transform: none !important;
        }
      }
    `;
    document.head.appendChild(style);
    
    // 优化滚动性能
    const scrollElements = document.querySelectorAll('.scene-list, .hotspot-list, .settings-panel');
    scrollElements.forEach(el => {
      el.style.webkitOverflowScrolling = 'touch';
    });
    
    // 减少动画
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.style.setProperty('--transition-duration', '0s');
    }
  }
  
  // ==================== 移动端样式 ====================
  
  function addMobileStyles() {
    const style = document.createElement('style');
    style.id = 'mobileStyles';
    style.textContent = `
      /* 触摸设备基础样式 */
      .touch-device * {
        -webkit-tap-highlight-color: transparent;
      }
      
      .touch-device button,
      .touch-device a,
      .touch-device [role="button"] {
        touch-action: manipulation;
      }
      
      /* 移动端菜单切换按钮 */
      .mobile-menu-toggle {
        display: none;
        width: 44px;
        height: 44px;
        padding: 0;
        margin-right: 8px;
        background: transparent;
        border: none;
        color: var(--text-primary, #262626);
        cursor: pointer;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        transition: background 0.2s;
      }
      
      .mobile-menu-toggle:active {
        background: rgba(0,0,0,0.08);
        transform: scale(0.95);
      }
      
      /* 移动端遮罩 */
      .mobile-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 998;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s;
        -webkit-backdrop-filter: blur(2px);
        backdrop-filter: blur(2px);
      }
      
      .mobile-overlay.active {
        opacity: 1;
        pointer-events: all;
      }
      
      /* 侧边栏关闭按钮 */
      .sidebar-close-btn {
        display: none;
        width: 44px;
        height: 48px;
        background: transparent;
        border: none;
        font-size: 24px;
        color: var(--text-tertiary, #8c8c8c);
        cursor: pointer;
        padding: 0;
        margin-right: auto;
        border-radius: 8px;
      }
      
      .sidebar-close-btn:active {
        background: rgba(0,0,0,0.05);
      }
      
      /* 底部操作栏 */
      .mobile-bottom-bar {
        display: none;
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: calc(60px + env(safe-area-inset-bottom, 0px));
        background: #ffffff;
        border-top: 1px solid #e8e8e8;
        z-index: 100;
        padding-bottom: env(safe-area-inset-bottom, 0px);
        box-shadow: 0 -2px 12px rgba(0,0,0,0.08);
      }
      
      .bottom-bar-btn {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        background: transparent;
        border: none;
        color: #595959;
        cursor: pointer;
        padding: 8px 4px;
        transition: all 0.15s;
        border-radius: 8px;
        margin: 4px 2px;
      }
      
      .bottom-bar-btn:active {
        color: #1890ff;
        background: rgba(24,144,255,0.1);
        transform: scale(0.95);
      }
      
      .bottom-bar-btn svg {
        width: 22px;
        height: 22px;
      }
      
      .bottom-bar-btn span {
        font-size: 10px;
        font-weight: 500;
      }
      
      /* 触摸提示 */
      .touch-hint {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.8);
        background: rgba(0,0,0,0.85);
        color: white;
        padding: 14px 28px;
        border-radius: 12px;
        font-size: 15px;
        font-weight: 500;
        z-index: 10000;
        opacity: 0;
        pointer-events: none;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        -webkit-backdrop-filter: blur(8px);
        backdrop-filter: blur(8px);
      }
      
      .touch-hint.show {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
      
      /* 场景切换指示器 */
      .scene-indicator {
        position: fixed;
        bottom: calc(80px + env(safe-area-inset-bottom, 0px));
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 6px;
        padding: 8px 12px;
        background: rgba(0,0,0,0.6);
        border-radius: 20px;
        z-index: 99;
        opacity: 0;
        transition: opacity 0.3s;
        pointer-events: none;
      }
      
      .scene-indicator.show {
        opacity: 1;
      }
      
      .scene-indicator-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: rgba(255,255,255,0.4);
        transition: all 0.2s;
      }
      
      .scene-indicator-dot.active {
        background: #fff;
        width: 18px;
        border-radius: 3px;
      }
      
      /* 移动端适配 */
      @media (max-width: 767px) {
        .mobile-menu-toggle {
          display: flex !important;
        }
        
        .sidebar {
          position: fixed;
          left: -100%;
          top: 0;
          bottom: 0;
          width: 85%;
          max-width: 320px;
          z-index: 999;
          transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 4px 0 16px rgba(0,0,0,0.15);
          will-change: left;
        }
        
        .sidebar.mobile-active {
          left: 0;
        }
        
        .sidebar-close-btn {
          display: block !important;
        }
        
        .mobile-bottom-bar {
          display: flex !important;
        }
        
        .viewer-container,
        #pano {
          padding-bottom: calc(60px + env(safe-area-inset-bottom, 0px));
        }
        
        /* 隐藏桌面端工具栏 */
        .nav-center {
          display: none !important;
        }
        
        .nav-right .btn-text {
          display: none !important;
        }
        
        .btn-primary span {
          display: none !important;
        }
        
        .btn-primary {
          width: 44px !important;
          height: 44px !important;
          padding: 0 !important;
          justify-content: center !important;
          border-radius: 10px !important;
        }
        
        /* 优化上传区域 */
        .upload-zone {
          margin: 12px;
          padding: 24px 16px;
          border-radius: 12px;
        }
        
        .upload-title {
          font-size: 14px;
        }
        
        .upload-desc {
          font-size: 12px;
        }
        
        .upload-tips {
          font-size: 11px;
        }
        
        /* 优化场景项 */
        .scene-item {
          margin-bottom: 12px;
          border-radius: 10px;
        }
        
        .scene-list {
          padding: 12px;
        }
        
        .scene-thumbnail {
          border-radius: 8px;
        }
        
        /* 优化标签页 */
        .tab-btn {
          font-size: 11px;
          padding: 10px 8px;
        }
        
        .tab-btn svg {
          width: 20px;
          height: 20px;
        }
        
        /* 触摸友好的尺寸 */
        .icon-btn,
        .tool-btn {
          min-width: 44px;
          min-height: 44px;
        }
        
        /* 模态框优化 */
        .modal-content,
        .modal-box {
          margin: 16px;
          max-height: calc(100vh - 32px);
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
        
        /* 输入框优化 */
        input, textarea, select {
          font-size: 16px !important; /* 防止 iOS 缩放 */
        }
        
        /* 热点优化 */
        .hotspot {
          transform: scale(1.2);
        }
        
        .hotspot-circle {
          width: 44px;
          height: 44px;
        }
      }
      
      /* 小屏手机适配 */
      @media (max-width: 374px) {
        .bottom-bar-btn span {
          font-size: 9px;
        }
        
        .bottom-bar-btn svg {
          width: 20px;
          height: 20px;
        }
        
        .sidebar {
          width: 90%;
        }
      }
      
      /* 平板适配 */
      @media (min-width: 768px) and (max-width: 1024px) {
        .sidebar {
          width: 280px;
        }
        
        .scene-item {
          margin-bottom: 16px;
        }
      }
      
      /* 横屏模式 */
      @media (max-height: 500px) and (orientation: landscape) {
        .mobile-bottom-bar {
          height: 50px;
          padding-bottom: 0;
        }
        
        .bottom-bar-btn {
          flex-direction: row;
          gap: 6px;
        }
        
        .bottom-bar-btn svg {
          width: 18px;
          height: 18px;
        }
        
        .sidebar {
          width: 50%;
          max-width: 280px;
        }
      }
      
      /* 安全区域适配（刘海屏/药丸屏） */
      @supports (padding: env(safe-area-inset-top)) {
        .top-nav {
          padding-top: env(safe-area-inset-top);
          height: calc(56px + env(safe-area-inset-top));
        }
        
        .main-container {
          top: calc(56px + env(safe-area-inset-top));
        }
        
        .sidebar {
          padding-top: env(safe-area-inset-top);
          padding-left: env(safe-area-inset-left);
        }
        
        .mobile-bottom-bar {
          padding-left: env(safe-area-inset-left);
          padding-right: env(safe-area-inset-right);
        }
      }
      
      /* 深色模式支持 */
      @media (prefers-color-scheme: dark) {
        .mobile-bottom-bar {
          background: #1a1a1a;
          border-top-color: #333;
        }
        
        .bottom-bar-btn {
          color: #999;
        }
        
        .bottom-bar-btn:active {
          background: rgba(24,144,255,0.2);
        }
      }
      
      /* 减少动画（无障碍） */
      @media (prefers-reduced-motion: reduce) {
        .sidebar,
        .mobile-overlay,
        .touch-hint,
        .bottom-bar-btn {
          transition: none !important;
        }
      }
    `;
    
    document.head.appendChild(style);
  }
  
  // ==================== 工具函数 ====================
  
  // 防止橡皮筋效果
  document.addEventListener('touchmove', function(e) {
    const target = e.target;
    const scrollable = target.closest('.scene-list, .hotspot-list, .settings-panel, .sidebar');
    
    if (!scrollable) {
      e.preventDefault();
    }
  }, { passive: false });
  
  // 暴露API
  window.mobileAdapter = {
    isMobile,
    isTablet,
    isTouchDevice,
    toggleSidebar: toggleMobileSidebar,
    showHint: showTouchHint
  };
  
})();
