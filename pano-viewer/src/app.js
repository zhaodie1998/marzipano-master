/**
 * 全景编辑器主应用
 * 整合所有功能模块
 */

import appInitializer from './app-init.js';

// 应用状态
const appState = {
  viewer: null,
  scenes: [],
  currentScene: null,
  autoRotate: false,
  rotateAnimation: null,
  modules: null
};

/**
 * 初始化应用
 */
async function initApp() {
  try {
    // 初始化所有模块
    appState.modules = await appInitializer.init({
      enablePerformanceMonitor: false,
      maxHistorySize: 50,
      maxLoadedScenes: 5,
      touchElement: document.getElementById('pano')
    });

    // 创建 Marzipano viewer
    appState.viewer = new Marzipano.Viewer(document.getElementById('pano'), {
      controls: {
        mouseViewMode: 'drag'
      }
    });

    // 绑定事件
    bindEvents();
    bindModuleEvents();

    // 从 localStorage 加载项目
    loadProject();

    // 如果没有场景，显示默认星空
    if (appState.scenes.length === 0) {
      showDefaultSky();
    }

    console.log('✅ 应用初始化完成');
  } catch (error) {
    console.error('❌ 应用初始化失败:', error);
  }
}

/**
 * 绑定 UI 事件
 */
function bindEvents() {
  const uploadArea = document.getElementById('uploadArea');
  const fileInput = document.getElementById('fileInput');

  // 上传事件
  uploadArea.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleFileSelect);

  // 拖拽上传
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    handleFileSelect({ target: { files: e.dataTransfer.files } });
  });

  // 按钮事件
  document.getElementById('uploadTrigger').addEventListener('click', () => fileInput.click());
  document.getElementById('addSceneBtn').addEventListener('click', () => fileInput.click());
  document.getElementById('autoRotateBtn').addEventListener('click', toggleAutoRotate);
  document.getElementById('fullscreenBtn').addEventListener('click', toggleFullscreen);
  document.getElementById('addHotspotBtn').addEventListener('click', showHotspotModal);
  document.getElementById('settingsBtn').addEventListener('click', togglePropertiesPanel);
  document.getElementById('closePanelBtn').addEventListener('click', togglePropertiesPanel);
  document.getElementById('saveBtn').addEventListener('click', saveProject);
  document.getElementById('helpBtn').addEventListener('click', showHelp);

  // 模态框事件
  document.getElementById('closeModalBtn').addEventListener('click', hideHotspotModal);
  document.getElementById('cancelHotspotBtn').addEventListener('click', hideHotspotModal);
  document.getElementById('confirmHotspotBtn').addEventListener('click', createHotspot);

  // 热点类型切换
  document.getElementById('hotspotType').addEventListener('change', (e) => {
    const contentGroup = document.getElementById('hotspotContentGroup');
    const linkGroup = document.getElementById('hotspotLinkGroup');
    if (e.target.value === 'link') {
      contentGroup.style.display = 'none';
      linkGroup.style.display = 'block';
      updateHotspotLinkOptions();
    } else {
      contentGroup.style.display = 'block';
      linkGroup.style.display = 'none';
    }
  });

  // 场景名称输入
  document.getElementById('sceneNameInput').addEventListener('change', (e) => {
    if (appState.currentScene) {
      appState.currentScene.name = e.target.value;
      updateSceneList();
      saveProject();
    }
  });
}

/**
 * 绑定模块事件
 */
function bindModuleEvents() {
  const { eventBus } = appState.modules;

  // 快捷键事件
  eventBus.on('shortcut:toggleAutoRotate', toggleAutoRotate);
  eventBus.on('shortcut:toggleFullscreen', toggleFullscreen);
  eventBus.on('shortcut:save', saveProject);
  eventBus.on('shortcut:showHelp', showHelp);
  eventBus.on('shortcut:delete', deleteCurrentHotspot);
  eventBus.on('shortcut:prevScene', prevScene);
  eventBus.on('shortcut:nextScene', nextScene);
  eventBus.on('shortcut:toggleHotspots', toggleHotspots);
  eventBus.on('shortcut:export', exportProject);

  // 触摸手势事件
  eventBus.on('gesture:doubleTap', () => { toggleFullscreen(); });
  eventBus.on('gesture:drag', ({ deltaX, deltaY }) => {
    if (!appState.currentScene) return;
    const v = appState.currentScene.view;
    const yawFactor = -deltaX * 0.002;
    const pitchFactor = -deltaY * 0.002;
    v.offsetYaw(yawFactor);
    v.offsetPitch(pitchFactor);
  });
  eventBus.on('gesture:pinch', ({ scale }) => {
    if (!appState.currentScene) return;
    const v = appState.currentScene.view;
    const fovDelta = -(scale - 1) * 0.2;
    v.offsetFov(fovDelta);
  });
  eventBus.on('gesture:inertia', ({ deltaX, deltaY }) => {
    if (!appState.currentScene) return;
    const v = appState.currentScene.view;
    const yawFactor = -deltaX * 0.002;
    const pitchFactor = -deltaY * 0.002;
    v.offsetYaw(yawFactor);
    v.offsetPitch(pitchFactor);
  });
  eventBus.on('gesture:longPress', () => { showHotspotModal(); });

  // 历史记录事件
  eventBus.on('history:changed', (info) => {
    console.log('历史记录变化:', info);
  });
}

/**
 * 处理文件选择
 */
async function handleFileSelect(e) {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;

  removeDefaultSceneIfPresent();
  showLoading();

  const { imageLoader } = appState.modules;
  const total = files.length;
  let completed = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      setProgress(
        Math.round((completed / total) * 100),
        `加载 ${file.name}...`
      );

      const imageData = await imageLoader.loadImage(file, {
        maxWidth: 8192,
        maxHeight: 4096,
        quality: 0.9
      });

      createScene(imageData, file.name, i === 0);
      completed++;
    } catch (error) {
      console.error(`加载失败: ${file.name}`, error);
      completed++;
    }
  }

  setProgress(100, '加载完成');
  setTimeout(() => hideLoading(), 300);
  e.target.value = '';
}

/**
 * 创建场景
 */
function createScene(imageData, filename, switchTo = false, options = {}) {
  const sceneId = 'scene_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  const sceneName = filename.replace(/\.[^/.]+$/, '');

  const source = Marzipano.ImageUrlSource.fromString(imageData);

  const img = new Image();
  img.onload = () => {
    const aspectRatio = img.width / img.height;
    let geometry;

    if (aspectRatio > 1.8 && aspectRatio < 2.2) {
      geometry = new Marzipano.EquirectGeometry([{ width: 4096 }]);
    } else {
      geometry = new Marzipano.CubeGeometry([{ tileSize: 1024, size: 1024 }]);
    }

    const limiter = Marzipano.RectilinearView.limit.traditional(4096, 120 * Math.PI / 180);
    const view = new Marzipano.RectilinearView(
      { yaw: 0, pitch: 0, fov: 90 * Math.PI / 180 },
      limiter
    );

    const scene = appState.viewer.createScene({
      source: source,
      geometry: geometry,
      view: view,
      pinFirstLevel: true
    });

    const sceneData = {
      id: sceneId,
      name: sceneName,
      imageData: imageData,
      scene: scene,
      view: view,
      hotspots: [],
      thumbnail: imageData,
      isDefault: !!options.isDefault
    };

    appState.scenes.push(sceneData);
    updateSceneList();

    if (switchTo || appState.scenes.length === 1) {
      switchScene(sceneId);
    }

    saveProject();
  };
  img.src = imageData;
}

/**
 * 移除默认场景
 */
function removeDefaultSceneIfPresent() {
  const idx = appState.scenes.findIndex(s => s.isDefault);
  if (idx !== -1) {
    const wasCurrent = appState.currentScene && appState.currentScene.id === appState.scenes[idx].id;
    appState.scenes.splice(idx, 1);
    if (wasCurrent) {
      document.getElementById('emptyViewer').style.display = 'flex';
      document.getElementById('controlBar').style.display = 'none';
    }
    updateSceneList();
  }
}

/**
 * 显示默认星空场景
 */
function showDefaultSky() {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const grd = ctx.createLinearGradient(0, 0, 0, height);
  grd.addColorStop(0, '#051527');
  grd.addColorStop(1, '#0a2540');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, width, height);

  const stars = 800;
  for (let i = 0; i < stars; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const r = Math.random() * 1.2 + 0.2;
    const alpha = Math.random() * 0.8 + 0.2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fill();
  }

  for (let i = 0; i < 40; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const r = Math.random() * 2 + 1.5;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 4, 0, Math.PI * 2);
    ctx.fill();
  }

  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
  createScene(dataUrl, '星空预览', true, { isDefault: true });
}

/**
 * 切换场景
 */
function switchScene(sceneId) {
  const sceneData = appState.scenes.find(s => s.id === sceneId);
  if (!sceneData) return;

  sceneData.scene.switchTo({
    transitionDuration: 1000
  });

  appState.currentScene = sceneData;

  updateSceneList();
  document.getElementById('emptyViewer').style.display = 'none';
  document.getElementById('controlBar').style.display = 'flex';
  document.getElementById('currentSceneName').textContent = sceneData.name;
  document.getElementById('sceneNameInput').value = sceneData.name;

  clearHotspots();
  sceneData.hotspots.forEach(hotspotData => {
    addHotspotToScene(sceneData, hotspotData);
  });
}

function prevScene() {
  if (appState.scenes.length === 0 || !appState.currentScene) return;
  const idx = appState.scenes.findIndex(s => s.id === appState.currentScene.id);
  const targetIdx = (idx - 1 + appState.scenes.length) % appState.scenes.length;
  switchScene(appState.scenes[targetIdx].id);
}

function nextScene() {
  if (appState.scenes.length === 0 || !appState.currentScene) return;
  const idx = appState.scenes.findIndex(s => s.id === appState.currentScene.id);
  const targetIdx = (idx + 1) % appState.scenes.length;
  switchScene(appState.scenes[targetIdx].id);
}

function toggleHotspots() {
  if (!appState.currentScene) return;
  const container = appState.currentScene.scene.hotspotContainer().domElement();
  container.classList.toggle('hide-hotspots');
}

function exportProject() {
  const data = {
    scenes: appState.scenes.filter(s => !s.isDefault).map(s => ({ id: s.id, name: s.name, hotspots: s.hotspots })),
    currentSceneId: appState.currentScene?.id,
    version: '1.0',
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'pano_project.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 更新场景列表
 */
function updateSceneList() {
  const sceneList = document.getElementById('sceneList');

  if (appState.scenes.length === 0) {
    sceneList.innerHTML = `
      <div class="empty-state">
        <p>暂无场景</p>
        <p class="hint">上传全景图开始创建</p>
      </div>
    `;
    return;
  }

  sceneList.innerHTML = appState.scenes.map(scene => `
    <div class="scene-item ${scene.id === appState.currentScene?.id ? 'active' : ''}" data-scene-id="${scene.id}">
      <img src="${scene.thumbnail}" alt="${scene.name}" class="scene-thumbnail">
      <div class="scene-info">
        <span class="scene-name">${scene.name}</span>
        <div class="scene-actions">
          <button class="scene-action-btn edit" data-action="edit" title="编辑">✏️</button>
          <button class="scene-action-btn delete" data-action="delete" title="删除">🗑️</button>
        </div>
      </div>
    </div>
  `).join('');

  sceneList.querySelectorAll('.scene-item').forEach(item => {
    const sceneId = item.dataset.sceneId;

    item.addEventListener('click', (e) => {
      if (!e.target.closest('.scene-actions')) {
        switchScene(sceneId);
      }
    });

    item.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        if (action === 'delete') {
          deleteScene(sceneId);
        } else if (action === 'edit') {
          switchScene(sceneId);
          togglePropertiesPanel();
        }
      });
    });
  });
}

/**
 * 删除场景
 */
function deleteScene(sceneId) {
  if (!confirm('确定要删除这个场景吗？')) return;

  const index = appState.scenes.findIndex(s => s.id === sceneId);
  if (index === -1) return;

  appState.scenes.splice(index, 1);

  if (appState.currentScene?.id === sceneId) {
    if (appState.scenes.length > 0) {
      switchScene(appState.scenes[0].id);
    } else {
      appState.currentScene = null;
      document.getElementById('emptyViewer').style.display = 'flex';
      document.getElementById('controlBar').style.display = 'none';
    }
  }

  updateSceneList();
  saveProject();
}

/**
 * 自动旋转
 */
function toggleAutoRotate() {
  appState.autoRotate = !appState.autoRotate;
  const btn = document.getElementById('autoRotateBtn');

  if (appState.autoRotate) {
    btn.classList.add('active');
    startAutoRotate();
  } else {
    btn.classList.remove('active');
    stopAutoRotate();
  }
}

function startAutoRotate() {
  if (!appState.currentScene) return;

  const velocity = -0.3;
  appState.rotateAnimation = Marzipano.autorotate({
    yawSpeed: velocity * Math.PI / 180,
    targetPitch: 0,
    targetFov: Math.PI / 2
  });

  appState.viewer.startMovement(appState.rotateAnimation);
}

function stopAutoRotate() {
  if (appState.rotateAnimation) {
    appState.viewer.stopMovement();
    appState.rotateAnimation = null;
  }
}

/**
 * 全屏
 */
function toggleFullscreen() {
  const element = document.documentElement;

  if (!document.fullscreenElement) {
    element.requestFullscreen().catch(err => {
      console.error('无法进入全屏:', err);
    });
  } else {
    document.exitFullscreen();
  }
}

/**
 * 热点相关
 */
function showHotspotModal() {
  if (!appState.currentScene) {
    alert('请先选择一个场景');
    return;
  }

  document.getElementById('hotspotModal').style.display = 'flex';
  document.getElementById('hotspotType').value = 'info';
  document.getElementById('hotspotTitle').value = '';
  document.getElementById('hotspotContent').value = '';
  document.getElementById('hotspotContentGroup').style.display = 'block';
  document.getElementById('hotspotLinkGroup').style.display = 'none';
}

function hideHotspotModal() {
  document.getElementById('hotspotModal').style.display = 'none';
}

function createHotspot() {
  const type = document.getElementById('hotspotType').value;
  const title = document.getElementById('hotspotTitle').value.trim();
  const content = document.getElementById('hotspotContent').value.trim();
  const linkScene = document.getElementById('hotspotLinkScene').value;

  if (!title) {
    alert('请输入热点标题');
    return;
  }

  if (type === 'link' && !linkScene) {
    alert('请选择链接场景');
    return;
  }

  const view = appState.currentScene.view;
  const coords = view.parameters();

  const hotspotData = {
    id: 'hotspot_' + Date.now(),
    type: type,
    title: title,
    content: type === 'link' ? linkScene : content,
    yaw: coords.yaw,
    pitch: coords.pitch
  };

  appState.currentScene.hotspots.push(hotspotData);
  addHotspotToScene(appState.currentScene, hotspotData);

  hideHotspotModal();
  saveProject();
  updateHotspotList();
}

function addHotspotToScene(sceneData, hotspotData) {
  const hotspotElement = document.createElement('div');
  hotspotElement.className = 'hotspot';
  hotspotElement.setAttribute('data-hotspot-id', hotspotData.id);

  const icon = hotspotData.type === 'link' ? '🚪' : hotspotData.type === 'image' ? '🖼️' : 'ℹ️';

  hotspotElement.innerHTML = `
    <div class="hotspot-circle">${icon}</div>
    <div class="hotspot-tooltip">${hotspotData.title}</div>
  `;

  hotspotElement.addEventListener('click', () => {
    handleHotspotClick(hotspotData);
  });

  sceneData.scene.hotspotContainer().createHotspot(hotspotElement, {
    yaw: hotspotData.yaw,
    pitch: hotspotData.pitch
  });
}

function handleHotspotClick(hotspotData) {
  if (hotspotData.type === 'link') {
    switchScene(hotspotData.content);
  } else if (hotspotData.type === 'info') {
    alert(`${hotspotData.title}\n\n${hotspotData.content}`);
  } else if (hotspotData.type === 'image') {
    alert(`图片热点: ${hotspotData.title}`);
  }
}

function clearHotspots() {
  if (appState.currentScene) {
    const container = appState.currentScene.scene.hotspotContainer().domElement();
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
  }
}

function updateHotspotLinkOptions() {
  const select = document.getElementById('hotspotLinkScene');
  select.innerHTML = '<option value="">选择场景</option>' +
    appState.scenes
      .filter(s => s.id !== appState.currentScene?.id)
      .map(s => `<option value="${s.id}">${s.name}</option>`)
      .join('');
}

function updateHotspotList() {
  const hotspotList = document.getElementById('hotspotList');

  if (!appState.currentScene || appState.currentScene.hotspots.length === 0) {
    hotspotList.innerHTML = '<p class="hint">暂无热点，点击"添加热点"创建</p>';
    return;
  }

  hotspotList.innerHTML = appState.currentScene.hotspots.map(hotspot => `
    <div class="hotspot-item">
      <div class="hotspot-item-info">
        <div class="hotspot-item-title">${hotspot.title}</div>
        <div class="hotspot-item-type">${getHotspotTypeName(hotspot.type)}</div>
      </div>
      <button class="scene-action-btn delete" onclick="window.deleteHotspot('${hotspot.id}')">🗑️</button>
    </div>
  `).join('');
}

function deleteHotspot(hotspotId) {
  if (!appState.currentScene) return;

  const index = appState.currentScene.hotspots.findIndex(h => h.id === hotspotId);
  if (index === -1) return;

  appState.currentScene.hotspots.splice(index, 1);

  clearHotspots();
  appState.currentScene.hotspots.forEach(hotspotData => {
    addHotspotToScene(appState.currentScene, hotspotData);
  });

  updateHotspotList();
  saveProject();
}

function deleteCurrentHotspot() {
  // 删除当前选中的热点（可以扩展选择逻辑）
  console.log('删除热点快捷键触发');
}

function getHotspotTypeName(type) {
  const names = {
    'info': '信息热点',
    'link': '场景链接',
    'image': '图片热点'
  };
  return names[type] || type;
}

function togglePropertiesPanel() {
  const panel = document.getElementById('propertiesPanel');
  panel.classList.toggle('show');
  updateHotspotList();
}

/**
 * 加载/保存
 */
function showLoading() {
  document.getElementById('loadingOverlay').style.display = 'flex';
  document.getElementById('progressBar').style.display = 'block';
}

function hideLoading() {
  document.getElementById('loadingOverlay').style.display = 'none';
}

function setProgress(percent, message) {
  const fill = document.getElementById('progressFill');
  const text = document.getElementById('loadingText');
  if (fill) fill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
  if (text) text.textContent = message || `进度 ${percent}%`;
}

function saveProject() {
  const projectData = {
    scenes: appState.scenes
      .filter(scene => !scene.isDefault)
      .map(scene => ({
        id: scene.id,
        name: scene.name,
        hotspots: scene.hotspots
      })),
    currentSceneId: appState.currentScene?.id,
    version: '1.0',
    savedAt: new Date().toISOString()
  };

  try {
    localStorage.setItem('pano_project_structure', JSON.stringify(projectData));
    console.log('✅ 项目结构已保存');
    showSaveNotification();
  } catch (e) {
    console.error('保存失败:', e);
  }
}

function showSaveNotification() {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 24px;
    background: #10b981;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    font-size: 14px;
    font-weight: 500;
  `;
  notification.textContent = '✅ 配置已保存';

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 2000);
}

function loadProject() {
  try {
    const saved = localStorage.getItem('pano_project_structure');
    if (saved) {
      const projectData = JSON.parse(saved);
      console.log('项目结构已加载');
    }
  } catch (e) {
    console.error('加载项目失败:', e);
  }
}

function showHelp() {
  const helpText = `
全景编辑器使用说明：

📁 上传场景
- 点击上传区域或拖拽图片
- 支持 JPG、PNG 格式
- 推荐分辨率：4096x2048 或更高

🎬 查看控制
- 鼠标拖动：旋转视角
- 鼠标滚轮：缩放视野
- 空格键：切换自动旋转
- F 键：切换全屏

📍 热点功能
- 点击"添加热点"按钮
- 热点将添加在当前视角中心
- 支持信息热点、场景链接

⌨️ 快捷键
- Ctrl+S：保存项目
- Ctrl+Z：撤销
- Ctrl+Y：重做
- Delete：删除选中项
- ?：显示帮助
  `;

  alert(helpText);
}

// 导出到全局作用域
window.deleteHotspot = deleteHotspot;

// 确保 Marzipano 已加载后再初始化
if (typeof Marzipano !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
} else {
  console.error('Marzipano 库未加载，等待加载...');
  window.addEventListener('load', () => {
    if (typeof Marzipano !== 'undefined') {
      initApp();
    } else {
      console.error('Marzipano 库加载失败');
    }
  });
}
