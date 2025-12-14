/**
 * 全景编辑器 - 主应用
 * 完整功能版本
 * 支持 Electron 桌面版和 Web 服务端部署
 */

'use strict';

// 检查运行环境
const isElectron = window.electronAPI !== undefined;
const isWebServer = !isElectron && window.apiClient !== undefined;
let currentProjectPath = null;
let currentProjectId = null; // Web 模式使用项目 ID

// 应用状态
const appState = {
  viewer: null,
  scenes: [],
  currentScene: null,
  hotspots: [],
  autoRotate: false,
  rotateAnimation: null,
  gyroEnabled: false,
  thumbRowHidden: false
};

/**
 * 初始化应用
 */
let projectLoadingInProgress = false; // 防止重复加载

function initApp() {
  console.log('🚀 初始化全景编辑器...');

  // 检查 Marzipano
  if (typeof Marzipano === 'undefined') {
    console.error('❌ Marzipano 未加载');
    alert('全景库加载失败，请刷新页面重试');
    return;
  }

  // 创建 Marzipano viewer
  appState.viewer = new Marzipano.Viewer(document.getElementById('pano'), {
    controls: {
      mouseViewMode: 'drag', // 默认为 drag，控制反转逻辑
    }
  });

  // 修正鼠标/触摸控制逻辑 (反转 Pitch 使拖拽更符合直觉)
  const controls = appState.viewer.controls();
  if (controls) {
    // 反转 DragControlMethod 的 Y 轴方向
    ['mouseViewDrag', 'touchView'].forEach(id => {
      const method = controls.method(id);
      if (method) {
        const originalMove = method._updateDynamicsMove;
        const originalRelease = method._updateDynamicsRelease;

        method._updateDynamicsMove = function(e) {
          originalMove.call(this, e);
          this._dynamics.y.offset *= -1;
        };

        method._updateDynamicsRelease = function(e) {
          originalRelease.call(this, e);
          this._dynamics.y.velocity *= -1;
        };
      }
    });
  }

  // 绑定事件
  bindEvents();
  
  // 监听来自主进程的项目加载请求
  if (isElectron) {
    let projectLoaded = false; // 标记是否已加载过项目
    
    window.electronAPI.onLoadProject((path) => {
      console.log('Loading project from:', path);
      if (projectLoadingInProgress) {
        console.log('⚠ 项目加载中，忽略重复请求');
        return;
      }
      projectLoaded = true;
      currentProjectPath = path;
      loadProjectFromDisk(path);
    });
    
    // 主动检查是否有当前项目 (处理刷新情况)
    // 延迟执行，给 onLoadProject 事件优先处理的机会
    setTimeout(async () => {
      if (projectLoaded || projectLoadingInProgress) {
        console.log('⚠ 项目已通过事件加载，跳过恢复检查');
        return;
      }
      
      const path = await window.electronAPI.getCurrentProjectPath();
      if (path) {
        console.log('Restoring project from:', path);
        if (projectLoadingInProgress) {
          console.log('⚠ 项目加载中，忽略重复请求');
          return;
        }
        currentProjectPath = path;
        loadProjectFromDisk(path);
      } else {
        showDefaultSky();
      }
    }, 100);
  } else if (isWebServer) {
    // Web 服务端模式：从 URL 参数获取项目 ID
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('project');
    
    if (projectId) {
      console.log('Loading project from server:', projectId);
      currentProjectId = projectId;
      loadProjectFromServer(projectId);
    } else {
      // 没有项目参数，显示默认场景或跳转到项目列表
      console.log('⚠ 未指定项目，显示默认场景');
      showDefaultSky();
    }
  } else {
    // 纯前端模式：从 localStorage 加载
    loadProject();
    if (appState.scenes.length === 0) {
      showDefaultSky();
    }
  }
  
  console.log('✅ 应用初始化完成');
}

/**
 * 绑定所有事件
 */
function bindEvents() {
  // 上传区域事件
  const uploadArea = document.getElementById('uploadArea');
  const fileInput = document.getElementById('fileInput');
  
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
  
  // 返回欢迎页/项目列表按钮
  const navActions = document.querySelector('.nav-actions');
  if (navActions) {
    const goHomeBtn = document.getElementById('goHomeBtn');
    if (goHomeBtn) {
      if (isElectron) {
        goHomeBtn.onclick = () => window.electronAPI.openWelcome();
      } else if (isWebServer) {
        goHomeBtn.onclick = () => window.location.href = 'welcome-web.html';
      } else {
        goHomeBtn.style.display = 'none';
      }
    } else {
      const backBtn = document.createElement('button');
      backBtn.className = 'btn';
      backBtn.innerHTML = '<span class="icon">🏠</span> 首页';
      if (isElectron) {
        backBtn.onclick = () => window.electronAPI.openWelcome();
      } else if (isWebServer) {
        backBtn.onclick = () => window.location.href = 'welcome-web.html';
      } else {
        backBtn.style.display = 'none';
      }
      const topControls = document.getElementById('topControls');
      if (topControls) {
        navActions.insertBefore(backBtn, topControls.nextSibling);
      } else {
        navActions.appendChild(backBtn);
      }
    }
  }
  
  // 其他按钮事件
  document.getElementById('uploadTrigger').addEventListener('click', () => fileInput.click());
  document.getElementById('addSceneBtn').addEventListener('click', () => fileInput.click());
  const sidebarToggle = document.getElementById('sidebarToggle');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      const sidebar = document.getElementById('sidebar');
      sidebar.classList.toggle('collapsed');
      renderSceneDock();
    });
  }
  // Bottom control bar bindings
  const bottomAutoRotateBtn = document.getElementById('bottomAutoRotateBtn');
  if (bottomAutoRotateBtn) bottomAutoRotateBtn.addEventListener('click', toggleAutoRotate);
  
  const bottomFullscreenBtn = document.getElementById('bottomFullscreenBtn');
  if (bottomFullscreenBtn) bottomFullscreenBtn.addEventListener('click', toggleFullscreen);

  const bottomCompassBtn = document.getElementById('bottomCompassBtn');
  if (bottomCompassBtn) bottomCompassBtn.addEventListener('click', toggleCompass);

  const gyroBtn = document.getElementById('gyroBtn');
  if (gyroBtn) gyroBtn.addEventListener('click', toggleGyroscope);

  const bottomAddHotspotBtn = document.getElementById('bottomAddHotspotBtn');
  if (bottomAddHotspotBtn) bottomAddHotspotBtn.addEventListener('click', showHotspotModal);

  const bottomAddMusicBtn = document.getElementById('bottomAddMusicBtn');
  if (bottomAddMusicBtn) bottomAddMusicBtn.addEventListener('click', addBackgroundMusic);

  const bottomAddTextBtn = document.getElementById('bottomAddTextBtn');
  if (bottomAddTextBtn) bottomAddTextBtn.addEventListener('click', addTextHotspot);

  const bottomScreenshotBtn = document.getElementById('bottomScreenshotBtn');
  if (bottomScreenshotBtn) bottomScreenshotBtn.addEventListener('click', takeScreenshot);
  
  const topAutoRotateBtn = document.getElementById('topAutoRotateBtn');
  if (topAutoRotateBtn) topAutoRotateBtn.addEventListener('click', toggleAutoRotate);
  const topFullscreenBtn = document.getElementById('topFullscreenBtn');
  if (topFullscreenBtn) topFullscreenBtn.addEventListener('click', toggleFullscreen);
  const topCompassBtn = document.getElementById('topCompassBtn');
  if (topCompassBtn) topCompassBtn.addEventListener('click', toggleCompass);
  const topGyroBtn = document.getElementById('topGyroBtn');
  if (topGyroBtn) topGyroBtn.addEventListener('click', toggleGyroscope);
  const topAddHotspotBtn = document.getElementById('topAddHotspotBtn');
  if (topAddHotspotBtn) topAddHotspotBtn.addEventListener('click', showHotspotModal);
  const topAddMusicBtn = document.getElementById('topAddMusicBtn');
  if (topAddMusicBtn) topAddMusicBtn.addEventListener('click', addBackgroundMusic);
  const topAddTextBtn = document.getElementById('topAddTextBtn');
  if (topAddTextBtn) topAddTextBtn.addEventListener('click', addTextHotspot);
  const topToggleHotspotsBtn = document.getElementById('topToggleHotspotsBtn');
  if (topToggleHotspotsBtn) {
    topToggleHotspotsBtn.addEventListener('click', () => {
      toggleHotspots();
      topToggleHotspotsBtn.classList.toggle('active');
    });
  }
  const topMinimapBtn = document.getElementById('topMinimapBtn');
  if (topMinimapBtn) topMinimapBtn.addEventListener('click', toggleMinimap);
  const topSettingsBtn = document.getElementById('topSettingsBtn');
  if (topSettingsBtn) topSettingsBtn.addEventListener('click', togglePropertiesPanel);

  // Keep old ID binding just in case
  const oldAutoRotateBtn = document.getElementById('autoRotateBtn');
  if (oldAutoRotateBtn) oldAutoRotateBtn.addEventListener('click', toggleAutoRotate);
  const oldFullscreenBtn = document.getElementById('fullscreenBtn');
  if (oldFullscreenBtn) oldFullscreenBtn.addEventListener('click', toggleFullscreen);
  const oldAddHotspotBtn = document.getElementById('addHotspotBtn');
  if (oldAddHotspotBtn) oldAddHotspotBtn.addEventListener('click', showHotspotModal);
  const toggleHotspotsBtn = document.getElementById('toggleHotspotsBtn');
  if (toggleHotspotsBtn) {
    toggleHotspotsBtn.addEventListener('click', () => {
      toggleHotspots();
      toggleHotspotsBtn.classList.toggle('active');
    });
  }
  const prevSceneBtn = document.getElementById('prevSceneBtn');
  if (prevSceneBtn) prevSceneBtn.addEventListener('click', prevScene);
  const nextSceneBtn = document.getElementById('nextSceneBtn');
  if (nextSceneBtn) nextSceneBtn.addEventListener('click', nextScene);
  const minimapBtn = document.getElementById('minimapBtn');
  if (minimapBtn) minimapBtn.addEventListener('click', toggleMinimap);
  document.getElementById('settingsBtn').addEventListener('click', togglePropertiesPanel);
  document.getElementById('closePanelBtn').addEventListener('click', togglePropertiesPanel);
  const thumbToggleBtn = document.getElementById('thumbToggleBtn');
  if (thumbToggleBtn) thumbToggleBtn.addEventListener('click', toggleThumbRow);
  window.addEventListener('resize', fitThumbRowToOneLine);
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    const applyBySidebar = () => {
      const isCollapsed = sidebar.classList.contains('collapsed');
      setThumbRowHidden(!isCollapsed);
    };
    // 初始状态
    applyBySidebar();
    // 监听侧栏展开/折叠
    const obs = new MutationObserver(applyBySidebar);
    obs.observe(sidebar, { attributes: true, attributeFilter: ['class'] });
    // 通过 MutationObserver 监听侧栏状态变化并联动底部缩略条，无需重绑点击事件
  }
  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) saveBtn.addEventListener('click', saveProject);
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) exportBtn.addEventListener('click', exportProject);
  const helpBtn = document.getElementById('helpBtn');
  if (helpBtn) helpBtn.addEventListener('click', showHelp);
  const graphBtn = document.getElementById('graphBtn');
  if (graphBtn) graphBtn.addEventListener('click', toggleGraph);
  const depBtn = document.getElementById('depBtn');
  if (depBtn) depBtn.addEventListener('click', showDependencies);
  initResizeHandlers();
  
  // 模态框事件
  document.getElementById('closeModalBtn').addEventListener('click', hideHotspotModal);
  document.getElementById('cancelHotspotBtn').addEventListener('click', hideHotspotModal);
  document.getElementById('confirmHotspotBtn').addEventListener('click', createHotspot);
  
  // 热点类型切换
  document.getElementById('hotspotType').addEventListener('change', (e) => {
    const contentGroup = document.getElementById('hotspotContentGroup');
    const linkGroup = document.getElementById('hotspotLinkGroup');
    const arrowGroup = document.getElementById('hotspotArrowTargetGroup');
    if (e.target.value === 'link') {
      contentGroup.style.display = 'none';
      linkGroup.style.display = 'block';
      if (arrowGroup) arrowGroup.style.display = 'none';
      updateHotspotLinkOptions();
    } else if (e.target.value === 'arrow') {
      contentGroup.style.display = 'none';
      linkGroup.style.display = 'block';
      if (arrowGroup) {
        arrowGroup.style.display = 'block';
        const v = appState.currentScene?.view?.parameters();
        if (v) {
          const tyaw = document.getElementById('hotspotArrowTargetYaw');
          const tpitch = document.getElementById('hotspotArrowTargetPitch');
          const tfov = document.getElementById('hotspotArrowTargetFov');
          if (tyaw) tyaw.value = Number(v.yaw).toFixed(3);
          if (tpitch) tpitch.value = Number(v.pitch).toFixed(3);
          if (tfov) tfov.value = Number(v.fov).toFixed(3);
        }
      }
      updateHotspotLinkOptions();
    } else {
      contentGroup.style.display = 'block';
      linkGroup.style.display = 'none';
      if (arrowGroup) arrowGroup.style.display = 'none';
    }
  });

  // 记录当前视角为箭头目标
  const recordArrowBtn = document.getElementById('recordArrowTargetBtn');
  if (recordArrowBtn) {
    recordArrowBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const v = appState.currentScene?.view?.parameters();
      if (!v) return;
      const tyaw = document.getElementById('hotspotArrowTargetYaw');
      const tpitch = document.getElementById('hotspotArrowTargetPitch');
      const tfov = document.getElementById('hotspotArrowTargetFov');
      if (tyaw) tyaw.value = Number(v.yaw).toFixed(3);
      if (tpitch) tpitch.value = Number(v.pitch).toFixed(3);
      if (tfov) tfov.value = Number(v.fov).toFixed(3);
    });
  }
  
  // 场景名称输入
  document.getElementById('sceneNameInput').addEventListener('change', (e) => {
    if (appState.currentScene) {
      appState.currentScene.name = e.target.value;
      updateSceneList();
      saveProject();
    }
  });
  const exposureInput = document.getElementById('exposureInput');
  const toneSelect = document.getElementById('toneMappingSelect');
  if (exposureInput) exposureInput.addEventListener('input', applyEXRSettings);
  if (toneSelect) toneSelect.addEventListener('change', applyEXRSettings);
  
  // 键盘快捷键
  document.addEventListener('keydown', (e) => {
    // Ctrl+S 保存
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      saveProject();
    }
    // F 键全屏
    if (e.key === 'f' || e.key === 'F') {
      toggleFullscreen();
    }
    // 空格键自动旋转
    if (e.key === ' ' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      toggleAutoRotate();
    }
    // H 键切换热点显示
    if ((e.key === 'h' || e.key === 'H') && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      toggleHotspots();
    }
    // 左右方向键切换场景
    if (e.key === 'ArrowLeft') {
      prevScene();
    }
    if (e.key === 'ArrowRight') {
      nextScene();
    }
    // Ctrl+E 导出项目
    if (e.ctrlKey && (e.key === 'e' || e.key === 'E')) {
      e.preventDefault();
      exportProject();
    }
    // ? 显示帮助
    if (e.key === '?') {
      showHelp();
    }
    if (e.key === 'd' || e.key === 'D') {
      showDependencies();
    }
  });
}

/**
 * 处理文件选择
 */
async function handleFileSelect(e) {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;

  // 检查是否有项目上下文
  if (isWebServer && !currentProjectId) {
    showNotification('❌ 请先创建或打开一个项目', 'error');
    return;
  }
  if (isElectron && !currentProjectPath) {
    showNotification('❌ 请先创建或打开一个项目', 'error');
    return;
  }

  removeDefaultSceneIfPresent();
  showLoading();
  setProgress(1, '准备上传文件...');

  const total = files.length;
  let completed = 0;

  // Web 服务端模式：批量上传
  if (isWebServer) {
    try {
      const imageFiles = files.filter(f => f.type.startsWith('image/') || 
        (window.EXRDecoder && EXRDecoder.isEXRFile(f.name)));
      
      if (imageFiles.length === 0) {
        hideLoading();
        showNotification('⚠ 没有有效的图片文件', 'warning');
        return;
      }

      // 上传文件到服务器
      setProgress(10, '正在上传到服务器...');
      const result = await window.apiClient.uploadImages(currentProjectId, imageFiles, (pct) => {
        setProgress(Math.round(10 + pct * 0.5), `上传中 ${pct}%`);
      });

      // 创建场景
      setProgress(60, '正在创建场景...');
      for (let i = 0; i < result.files.length; i++) {
        const fileInfo = result.files[i];
        const imageUrl = fileInfo.url;
        const name = fileInfo.originalName;
        
        await createScene(imageUrl, name, i === 0, {
          isServerAsset: true,
          fileName: fileInfo.fileName
        });
        
        setProgress(60 + Math.round((i + 1) / result.files.length * 35), `创建场景 ${i + 1}/${result.files.length}`);
      }

      setProgress(100, '完成');
      setTimeout(() => hideLoading(), 300);
      e.target.value = '';
      return;
    } catch (err) {
      console.error('上传失败:', err);
      showNotification(`❌ 上传失败: ${err.message}`, 'error');
      hideLoading();
      e.target.value = '';
      return;
    }
  }

  // Electron 或纯前端模式
  const readNext = async (i) => {
    if (i >= total) {
      setProgress(100, '读取完成');
      setTimeout(() => hideLoading(), 300);
      return;
    }

    const file = files[i];
    const name = file.name || `图片${i+1}`;
    const isImage = file.type.startsWith('image/');
    const isEXR = window.EXRDecoder && EXRDecoder.isEXRFile(name);

    if (!isImage && !isEXR) {
      completed++;
      await readNext(i + 1);
      return;
    }

    try {
      let dataUrl;
      let buffer = null;

      // Electron 环境下获取 ArrayBuffer
      if (isElectron) {
        buffer = await file.arrayBuffer();
      }

      if (isEXR) {
        if (file.size > 20 * 1024 * 1024) {
          const proceed = confirm('EXR 文件较大，可能耗时较长，是否继续解码？');
          if (!proceed) {
            completed++;
            await readNext(i + 1);
            return;
          }
        }
        const res = await EXRDecoder.processFile(file, (pct, msg) => {
          const overall = Math.max(1, Math.min(99, Math.round(((completed + pct / 100) / total) * 100)));
          setProgress(overall, msg || `处理 ${name}`);
        });
        dataUrl = res.dataURL;
        
        let savedFileName = name;
        if (isElectron && currentProjectPath) {
          const base = name.replace(/\.[^/.]+$/, '');
          const jpgName = base + '.jpg';
          await window.electronAPI.saveDataUrlAsset(currentProjectPath, res.dataURL, jpgName);
          dataUrl = await window.electronAPI.getAssetUrl(currentProjectPath, jpgName);
          savedFileName = jpgName;
          console.log(`💾 EXR 已保存为 JPG: ${name} -> ${jpgName}`);
        }

        await createScene(dataUrl, name, i === 0, { 
          isElectronAsset: true, 
          fileName: savedFileName,
          exrBuffer: res.buffer
        });
      } else {
        // 普通图片
        if (isElectron && currentProjectPath) {
          const savedFileName = await window.electronAPI.saveAsset(currentProjectPath, buffer, name);
          dataUrl = await window.electronAPI.getAssetUrl(currentProjectPath, savedFileName);
          
          console.log(`💾 图片已保存: ${name} -> ${savedFileName}`);
          
          await createScene(dataUrl, name, i === 0, { 
            isElectronAsset: true, 
            fileName: savedFileName 
          });
        } else {
          // 纯前端模式（无服务端）
          const res = await EXRDecoder.processFile(file, (pct, msg) => {
            const overall = Math.max(1, Math.min(99, Math.round(((completed + pct / 100) / total) * 100)));
            setProgress(overall, msg || `读取 ${name}`);
          });
          dataUrl = res.dataURL;
          await createScene(dataUrl, name, i === 0);
        }
      }
      
      completed++;
      const overall = Math.max(1, Math.min(99, Math.round((completed / total) * 100)));
      setProgress(overall, `已处理 ${completed}/${total}`);
      await readNext(i + 1);
    } catch (err) {
      console.error('处理文件失败:', err);
      showNotification(`❌ ${file.name} 处理失败: ${err.message}`, 'error');
      
      if (String(err?.message || '').includes('未加载') || String(err).includes('EXRLoader')) {
        alert('EXR 支持库未能加载，已跳过该 EXR 文件。请连接网络或稍后重试。');
      }
      completed++;
      await readNext(i + 1);
    }
  };

  await readNext(0);
  e.target.value = '';
}

async function applyEXRSettings() {
  const scene = appState.currentScene;
  if (!scene || !scene.exrBuffer) return;
  const exposureEl = document.getElementById('exposureInput');
  const toneEl = document.getElementById('toneMappingSelect');
  const exposure = parseFloat(exposureEl?.value || '1');
  const tone = toneEl?.value || 'ACES';
  showLoading();
  setProgress(10, '应用 HDR 设置...');
  try {
    const dataUrl = await EXRDecoder.renderEXRFromBuffer(scene.exrBuffer, { exposure, toneMapping: tone }, (pct, msg) => {
      setProgress(Math.max(1, Math.min(99, Math.round(pct))), msg || '渲染中...');
    });
    await rebuildSceneTexture(scene, dataUrl);
    setProgress(100, '完成');
  } catch (e) {
    console.error(e);
  } finally {
    setTimeout(() => hideLoading(), 200);
  }
}

async function rebuildSceneTexture(sceneData, newImageData) {
  return new Promise((resolve) => {
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
      const currentParams = sceneData.view.parameters();
      const view = new Marzipano.RectilinearView(currentParams, limiter);
      const source = Marzipano.ImageUrlSource.fromString(newImageData);
      const newScene = appState.viewer.createScene({ source, geometry, view, pinFirstLevel: true });
      sceneData.scene = newScene;
      sceneData.view = view;
      sceneData.imageData = newImageData;
      sceneData.thumbnail = newImageData;
      if (appState.currentScene?.id === sceneData.id) {
        switchScene(sceneData.id);
      }
      resolve(true);
    };
    img.src = newImageData;
  });
}

function showDependencies() {
  const modal = document.getElementById('depModal');
  const content = document.getElementById('depContent');
  if (!modal || !content) return;
  const hasThree = !!window.THREE;
  const hasEXR = !!(window.THREE && (THREE.EXRLoader || window.createEXRLoader || window.getEXRLoaderClass));
  const sources = [
    { name: '本地 three.min.js', url: 'pano-viewer/libs/three.min.js' },
    { name: '本地 EXRLoader.js', url: 'pano-viewer/libs/EXRLoader.js' },
    { name: 'CDN three', url: 'cdn.jsdelivr/cdnjs/unpkg' },
    { name: 'CDN EXRLoader', url: 'cdn.jsdelivr/cdnjs/unpkg' }
  ];
  const html = `
    <div>Three.js：${hasThree ? '已加载' : '未加载'}</div>
    <div>EXRLoader：${hasEXR ? '已加载' : '未加载'}</div>
    <div style="margin-top:8px;color:#64748b;">建议将 three.min.js 和 EXRLoader.js 放到目录：pano-viewer/libs/ 并刷新页面，以避免网络拦截。</div>
  `;
  content.innerHTML = html;
  modal.style.display = 'flex';
  const closeBtn = document.getElementById('closeDepBtn');
  const confirmBtn = document.getElementById('confirmDepBtn');
  const hide = () => { modal.style.display = 'none'; };
  if (closeBtn) closeBtn.onclick = hide;
  if (confirmBtn) confirmBtn.onclick = hide;
}

/**
 * 创建场景 - 返回 Promise 以支持异步等待
 */
function createScene(imageData, filename, switchTo = false, options = {}) {
  return new Promise((resolve, reject) => {
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
      const view = new Marzipano.RectilinearView({ yaw: 0, pitch: 0, fov: 90 * Math.PI / 180 }, limiter);
      
      const scene = appState.viewer.createScene({
        source: source,
        geometry: geometry,
        view: view,
        pinFirstLevel: true
      });
      
      // Generate a small thumbnail for persistence
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = 320;
      thumbCanvas.height = 160;
      const ctx = thumbCanvas.getContext('2d');
      ctx.drawImage(img, 0, 0, thumbCanvas.width, thumbCanvas.height);
      const thumbnailDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.6);

      const sceneData = {
        id: sceneId,
        name: sceneName,
        imageData: imageData,
        fileName: options.fileName || filename,
        scene: scene,
        view: view,
        hotspots: [],
        thumbnail: thumbnailDataUrl,
        isDefault: !!options.isDefault,
        exrBuffer: options.exrBuffer || null
      };
      
      appState.scenes.push(sceneData);
      updateSceneList();
      
      if (switchTo || appState.scenes.length === 1) {
        switchScene(sceneId);
      }
      
      // 保存项目（非默认场景时）
      if (!options.isDefault) {
        saveProject();
      }
      
      console.log(`✅ 场景创建完成: ${sceneName}, fileName: ${sceneData.fileName}`);
      resolve(sceneData);
    };
    
    img.onerror = (err) => {
      console.error('Failed to load image:', imageData, err);
      showNotification(`❌ 图片加载失败: ${sceneName}`, 'error');
      reject(new Error(`图片加载失败: ${sceneName}`));
    };
    
    img.src = imageData;
  });
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
 * 显示默认星空场景 (升级版：数字空间) -> 替换为明亮全景图
 */
function showDefaultSky() {
  // 检查是否已有默认场景，避免重复创建
  const existingDefault = appState.scenes.find(s => s.isDefault);
  if (existingDefault) {
    console.log('⚠ 默认场景已存在，跳过创建');
    switchScene(existingDefault.id);
    return;
  }
  
  // 使用下载的炫酷明亮全景图
  const imageUrl = 'img/bright-pano.jpg';
  createScene(imageUrl, '明亮空间', true, { isDefault: true });
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
  document.getElementById('sceneNameInput').value = sceneData.name;
  
  // Update overlay info
  const overlayName = document.getElementById('overlaySceneName');
  const overlayCount = document.getElementById('overlaySceneCount');
  if (overlayName) overlayName.textContent = sceneData.name;
  if (overlayCount) {
    const total = appState.scenes.filter(s => !s.isDefault).length;
    const currentIdx = appState.scenes.filter(s => !s.isDefault).findIndex(s => s.id === sceneId) + 1;
    overlayCount.textContent = `${currentIdx} / ${total}`;
  }

  clearHotspots();
  sceneData.hotspots.forEach(hotspotData => {
    addHotspotToScene(sceneData, hotspotData);
  });
  renderMinimap();
  if (graphMode) renderGraph();
  renderSceneDock();
  renderThumbCarousel();
  scheduleIdleAutorotate();
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
    <div class="scene-item ${scene.id === appState.currentScene?.id ? 'active' : ''}" data-scene-id="${scene.id}" draggable="true">
      <img src="${scene.thumbnail}" alt="${scene.name}" class="scene-thumbnail">
      <div class="scene-info">
        <span class="scene-name" title="${scene.name}">${scene.name}</span>
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
    const delBtn = item.querySelector('.scene-action-btn.delete');
    if (delBtn) {
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteScene(sceneId);
      });
    }
    const editBtn = item.querySelector('.scene-action-btn.edit');
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const s = appState.scenes.find(x => x.id === sceneId);
        if (!s) return;
        const name = prompt('重命名场景', s.name || '');
        if (name && name.trim()) {
          s.name = name.trim();
          updateSceneList();
          saveProject();
        }
      });
    }
    
    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', sceneId);
      item.classList.add('dragging');
    });
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      item.classList.remove('drag-over');
    });
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      item.classList.add('drag-over');
    });
    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over');
    });
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      const fromId = e.dataTransfer.getData('text/plain');
      const toId = sceneId;
      if (!fromId || fromId === toId) return;
      const fromIdx = appState.scenes.findIndex(s => s.id === fromId);
      const toIdx = appState.scenes.findIndex(s => s.id === toId);
      if (fromIdx === -1 || toIdx === -1) return;
      const [moved] = appState.scenes.splice(fromIdx, 1);
      appState.scenes.splice(toIdx, 0, moved);
      updateSceneList();
      saveProject();
    });
  });
  renderSceneDock();
  renderThumbCarousel();
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
  
  // Sync state to all auto-rotate buttons
  const btns = document.querySelectorAll('#autoRotateBtn, #bottomAutoRotateBtn, #topAutoRotateBtn');
  
  if (appState.autoRotate) {
    btns.forEach(btn => btn.classList.add('active'));
    startAutoRotate();
    showNotification('✓ 自动旋转已开启');
  } else {
    btns.forEach(btn => btn.classList.remove('active'));
    stopAutoRotate();
    showNotification('✓ 自动旋转已关闭');
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
    pitch: coords.pitch,
    targetYaw: undefined,
    targetPitch: undefined,
    targetFov: undefined
  };
  if (type === 'arrow') {
    const tyaw = parseFloat(document.getElementById('hotspotArrowTargetYaw')?.value || '');
    const tpitch = parseFloat(document.getElementById('hotspotArrowTargetPitch')?.value || '');
    const tfov = parseFloat(document.getElementById('hotspotArrowTargetFov')?.value || '');
    hotspotData.targetYaw = isNaN(tyaw) ? coords.yaw : tyaw;
    hotspotData.targetPitch = isNaN(tpitch) ? coords.pitch : tpitch;
    hotspotData.targetFov = isNaN(tfov) ? coords.fov : tfov;
    if (linkScene) {
      hotspotData.targetScene = linkScene;
    }
  }
  
  appState.currentScene.hotspots.push(hotspotData);
  addHotspotToScene(appState.currentScene, hotspotData);
  
  hideHotspotModal();
  saveProject();
  updateHotspotList();
}

function addHotspotToScene(sceneData, hotspotData) {
  const hotspotElement = document.createElement('div');
  hotspotElement.setAttribute('data-hotspot-id', hotspotData.id);
  
  if (hotspotData.type === 'link' || hotspotData.type === 'arrow') {
    hotspotElement.className = 'link-hotspot';
    if (hotspotData.type === 'arrow') {
      hotspotElement.innerHTML = `
        <svg class="link-hotspot-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2l7 7h-4v6h-6V9H5l7-7z"/></svg>
        <div class="link-hotspot-tooltip">${hotspotData.title}</div>
      `;
    } else {
      hotspotElement.innerHTML = `
        <img src="img/link.png" class="link-hotspot-icon">
        <div class="link-hotspot-tooltip">${hotspotData.title}</div>
      `;
    }
  } else {
    hotspotElement.className = 'hotspot';
    const icon = hotspotData.type === 'image' ? '🖼️' : 'ℹ️';
    
    hotspotElement.innerHTML = `
      <div class="hotspot-circle">${icon}</div>
      <div class="hotspot-tooltip">${hotspotData.title}</div>
    `;
  }
  
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
  } else if (hotspotData.type === 'arrow') {
    if (hotspotData.targetScene) {
      const toYaw = hotspotData.targetYaw ?? 0;
      const toPitch = hotspotData.targetPitch ?? 0;
      const toFov = hotspotData.targetFov ?? Math.PI/2;
      switchScene(hotspotData.targetScene);
      setTimeout(() => {
        appState.viewer.lookTo({ yaw: toYaw, pitch: toPitch, fov: toFov }, { transitionDuration: 800 });
      }, 350);
    } else {
      const v = appState.currentScene?.view?.parameters() || {};
      const toYaw = hotspotData.targetYaw ?? hotspotData.yaw ?? v.yaw ?? 0;
      const toPitch = hotspotData.targetPitch ?? hotspotData.pitch ?? v.pitch ?? 0;
      const toFov = hotspotData.targetFov ?? v.fov ?? Math.PI/2;
      appState.viewer.lookTo({ yaw: toYaw, pitch: toPitch, fov: toFov }, { transitionDuration: 800 });
    }
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
      <button class="scene-action-btn delete" onclick="deleteHotspot('${hotspot.id}')">🗑️</button>
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

function getHotspotTypeName(type) {
  const names = {
    'info': '信息热点',
    'link': '场景链接',
    'image': '图片热点',
    'arrow': '箭头路径'
  };
  return names[type] || type;
}

function togglePropertiesPanel() {
  const panel = document.getElementById('propertiesPanel');
  panel.classList.toggle('show');
  updateHotspotList();
}

function toggleHotspots() {
  if (!appState.currentScene) return;
  const container = appState.currentScene.scene.hotspotContainer().domElement();
  container.classList.toggle('hide-hotspots');
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

async function saveProject() {
  const projectData = {
    scenes: appState.scenes
      .filter(scene => !scene.isDefault)
      .map(scene => ({
        id: scene.id,
        name: scene.name,
        hotspots: scene.hotspots,
        // 持久化只保存文件名，确保项目可移动
        imageFile: (() => {
          // 优先使用 fileName（上传时保存的原始文件名）
          if (scene.fileName) {
            return scene.fileName;
          }
          
          const d = scene.imageData || '';
          try {
            // 如果是 file:// URL，提取文件名
            if (typeof d === 'string' && d.startsWith('file:')) {
              const u = new URL(d);
              const fname = decodeURIComponent(u.pathname.split('/').pop() || '');
              return fname;
            }
            // 如果是 dataURL，使用备用文件名
            if (typeof d === 'string' && d.startsWith('data:')) {
              return 'image_' + scene.id + '.jpg';
            }
            // 如果已经是文件名，直接返回
            if (typeof d === 'string' && !d.includes('/') && !d.includes('\\')) {
              return d;
            }
            return d;
          } catch (e) {
            console.error('处理 imageFile 失败:', e);
            return scene.fileName || 'image.jpg';
          }
        })()
      })),
    currentSceneId: appState.currentScene?.id,
    version: '1.0',
    savedAt: new Date().toISOString()
  };
  
  try {
    if (isElectron && currentProjectPath) {
      const success = await window.electronAPI.saveProjectData(currentProjectPath, projectData);
      if (success) {
        console.log('✅ 项目已保存:', projectData.scenes.map(s => s.imageFile));
        showNotification('✅ 项目已保存');
      } else {
        showNotification('❌ 保存失败', 'error');
      }
    } else if (isWebServer && currentProjectId) {
      // Web 服务端模式
      const result = await window.apiClient.saveProject(currentProjectId, projectData);
      if (result.success) {
        console.log('✅ 项目已保存到服务器:', projectData.scenes.map(s => s.imageFile));
        showNotification('✅ 项目已保存');
      } else {
        showNotification('❌ 保存失败', 'error');
      }
    } else {
      // 纯前端模式（localStorage）
      localStorage.setItem('pano_project_structure', JSON.stringify(projectData));
      console.log('✅ 项目结构已保存 (localStorage)');
      showNotification('✅ 配置已保存');
    }
  } catch (e) {
    console.error('保存失败:', e);
    showNotification('❌ 保存失败: ' + e.message, 'error');
  }
}

/**
 * 从本地加载项目 (Electron)
 */
async function loadProjectFromDisk(projectPath) {
  // 防止重复加载
  if (projectLoadingInProgress) {
    console.log('⚠ 项目正在加载中，跳过重复请求');
    return;
  }
  projectLoadingInProgress = true;
  
  try {
    console.log('📂 正在加载项目:', projectPath);
    const data = await window.electronAPI.loadProjectData(projectPath);
    if (!data) {
      console.log('⚠ 项目数据为空，显示默认场景');
      showDefaultSky();
      projectLoadingInProgress = false;
      return;
    }
    
    // 清空现有场景（包括销毁 Marzipano 场景对象）
    appState.scenes.forEach(s => {
      if (s.scene) {
        try {
          appState.viewer.destroyScene(s.scene);
        } catch (e) {
          console.warn('销毁场景失败:', e);
        }
      }
    });
    appState.scenes = [];
    appState.currentScene = null;
    
    if (data.scenes && data.scenes.length > 0) {
      console.log(`📋 找到 ${data.scenes.length} 个场景`);
      
      for (const s of data.scenes) {
        // 读取持久化的文件名
        let fileName = s.imageFile || s.imageData;
        
        // 如果是 EXR 文件，转换为对应的 JPG
        if (typeof fileName === 'string' && fileName.toLowerCase().endsWith('.exr')) {
          const base = fileName.replace(/\.[^/.]+$/, '');
          fileName = base + '.jpg';
          console.log(`🔄 EXR 转换: ${s.imageFile} -> ${fileName}`);
        }
        
        // 转换为完整的 file:// URL
        let imageUrl;
        if (isElectron && currentProjectPath) {
          // 确保使用文件名获取完整 URL
          if (!fileName.startsWith('data:') && !fileName.startsWith('file:') && !fileName.startsWith('http')) {
            imageUrl = await window.electronAPI.getAssetUrl(currentProjectPath, fileName);
            console.log(`✅ 资源路径: ${fileName} -> ${imageUrl}`);
          } else {
            imageUrl = fileName;
          }
        } else {
          imageUrl = fileName;
        }
        
        // 创建场景对象
        await new Promise((resolve) => {
          const img = new Image();
          
          // 如果是 .exr 文件，则不尝试作为普通图片加载
          if (imageUrl.toLowerCase().endsWith('.exr')) {
             console.warn(`⚠ 暂不支持直接预览 EXR 文件: ${imageUrl}`);
             // 创建一个占位场景或使用默认纹理
             const geometry = new Marzipano.CubeGeometry([{ tileSize: 1024, size: 1024 }]);
             const limiter = Marzipano.RectilinearView.limit.traditional(4096, 120 * Math.PI / 180);
             const view = new Marzipano.RectilinearView({ yaw: 0, pitch: 0, fov: 90 * Math.PI / 180 }, limiter);
             
             // 使用一个深色占位图作为源，或者提示用户
             const source = new Marzipano.ImageUrlSource(() => {
               return { url: 'img/nature-pano.jpg' }; // 临时使用默认图作为占位，避免报错
             });
             
             const scene = appState.viewer.createScene({ source, geometry, view, pinFirstLevel: true });
             
             const sceneData = {
               id: s.id,
               name: s.name + ' (EXR Preview Unavailable)',
               imageData: imageUrl,
               fileName: fileName,
               scene: scene,
               view: view,
               hotspots: s.hotspots || [],
               thumbnail: 'img/nature-pano.jpg' // EXR 没有缩略图，使用默认
             };
             appState.scenes.push(sceneData);
             showNotification(`⚠ EXR 格式仅支持部分功能: ${s.name}`, 'warning');
             resolve();
             return;
          }

          img.onload = () => {
            const aspectRatio = img.width / img.height;
            let geometry;
            if (aspectRatio > 1.8 && aspectRatio < 2.2) {
              geometry = new Marzipano.EquirectGeometry([{ width: 4096 }]);
            } else {
              geometry = new Marzipano.CubeGeometry([{ tileSize: 1024, size: 1024 }]);
            }
            const limiter = Marzipano.RectilinearView.limit.traditional(4096, 120 * Math.PI / 180);
            const view = new Marzipano.RectilinearView({ yaw: 0, pitch: 0, fov: 90 * Math.PI / 180 }, limiter);
            const source = Marzipano.ImageUrlSource.fromString(imageUrl);
            const scene = appState.viewer.createScene({ source, geometry, view, pinFirstLevel: true });
            
            const sceneData = {
              id: s.id,
              name: s.name,
              imageData: imageUrl,  // 保存完整 URL 用于显示
              fileName: fileName,   // 保存文件名用于持久化
              scene: scene,
              view: view,
              hotspots: s.hotspots || [],
              thumbnail: imageUrl
            };
            appState.scenes.push(sceneData);
            console.log(`✅ 场景已加载: ${s.name}`);
            resolve();
          };
          img.onerror = (err) => {
            console.error(`❌ 图片加载失败: ${imageUrl}`, err);
            showNotification(`❌ 加载失败: ${s.name}`, 'error');
            resolve(); // 跳过但继续
          };
          img.src = imageUrl;
        });
      }
      
      updateSceneList();
      
      if (appState.scenes.length > 0 && appState.scenes[0].thumbnail && currentProjectPath) {
        window.electronAPI.loadProjectData(currentProjectPath).then(projectData => {
          if (projectData && projectData.thumbnail !== appState.scenes[0].thumbnail) {
            window.electronAPI.saveProjectData(currentProjectPath, { thumbnail: appState.scenes[0].thumbnail })
              .then(() => console.log('✅ Updated project thumbnail via API'));
          }
        });
      }

      // Switch to saved scene or first scene
      const targetId = data.currentSceneId || (appState.scenes[0] && appState.scenes[0].id);
      if (targetId) {
        switchScene(targetId);
        console.log(`✅ 项目加载完成，当前场景: ${appState.currentScene?.name}`);
      }
    } else {
      console.log('⚠ 项目无场景，显示默认场景');
      showDefaultSky();
    }
    
    projectLoadingInProgress = false;
  } catch (e) {
    console.error('❌ 加载项目失败:', e);
    showNotification('❌ 加载项目失败: ' + e.message, 'error');
    showDefaultSky();
    projectLoadingInProgress = false;
  }
}

/**
 * 从服务器加载项目 (Web 模式)
 */
async function loadProjectFromServer(projectId) {
  if (projectLoadingInProgress) {
    console.log('⚠ 项目正在加载中，跳过重复请求');
    return;
  }
  projectLoadingInProgress = true;
  
  try {
    console.log('📂 正在从服务器加载项目:', projectId);
    const data = await window.apiClient.getProject(projectId);
    
    if (!data) {
      console.log('⚠ 项目数据为空，显示默认场景');
      showDefaultSky();
      projectLoadingInProgress = false;
      return;
    }
    
    currentProjectId = projectId;
    
    // 清空现有场景
    appState.scenes.forEach(s => {
      if (s.scene) {
        try {
          appState.viewer.destroyScene(s.scene);
        } catch (e) {
          console.warn('销毁场景失败:', e);
        }
      }
    });
    appState.scenes = [];
    appState.currentScene = null;
    
    if (data.scenes && data.scenes.length > 0) {
      console.log(`📋 找到 ${data.scenes.length} 个场景`);
      
      for (const s of data.scenes) {
        let fileName = s.imageFile || s.imageData;
        
        // 获取完整 URL
        const imageUrl = window.apiClient.getAssetUrl(projectId, fileName);
        
        if (!imageUrl) {
          console.warn(`⚠ 无法获取资源 URL: ${fileName}`);
          continue;
        }
        
        // 创建场景对象
        await new Promise((resolve) => {
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
            const view = new Marzipano.RectilinearView({ yaw: 0, pitch: 0, fov: 90 * Math.PI / 180 }, limiter);
            const source = Marzipano.ImageUrlSource.fromString(imageUrl);
            const scene = appState.viewer.createScene({ source, geometry, view, pinFirstLevel: true });
            
            const sceneData = {
              id: s.id,
              name: s.name,
              imageData: imageUrl,
              fileName: fileName,
              scene: scene,
              view: view,
              hotspots: s.hotspots || [],
              thumbnail: imageUrl
            };
            appState.scenes.push(sceneData);
            console.log(`✅ 场景已加载: ${s.name}`);
            resolve();
          };
          img.onerror = (err) => {
            console.error(`❌ 图片加载失败: ${imageUrl}`, err);
            showNotification(`❌ 加载失败: ${s.name}`, 'error');
            resolve();
          };
          img.src = imageUrl;
        });
      }
      
      updateSceneList();
      
      const targetId = data.currentSceneId || (appState.scenes[0] && appState.scenes[0].id);
      if (targetId) {
        switchScene(targetId);
        console.log(`✅ 项目加载完成，当前场景: ${appState.currentScene?.name}`);
      }
    } else {
      console.log('⚠ 项目无场景，显示默认场景');
      showDefaultSky();
    }
    
    projectLoadingInProgress = false;
  } catch (e) {
    console.error('❌ 加载项目失败:', e);
    showNotification('❌ 加载项目失败: ' + e.message, 'error');
    showDefaultSky();
    projectLoadingInProgress = false;
  }
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
  const modal = document.getElementById('helpModal');
  if (!modal) {
    alert('快捷键：Space 自动旋转，F 全屏，H 热点显示/隐藏，←/→ 场景切换，Ctrl+S 保存，Ctrl+E 导出，? 帮助');
    return;
  }
  modal.style.display = 'flex';
  const closeBtn = document.getElementById('closeHelpBtn');
  const confirmBtn = document.getElementById('confirmHelpBtn');
  const hide = () => { modal.style.display = 'none'; };
  if (closeBtn) closeBtn.onclick = hide;
  if (confirmBtn) confirmBtn.onclick = hide;
}

function toggleMinimap() {
  const el = document.getElementById('minimap');
  if (!el) return;
  const visible = el.style.display !== 'none';
  el.style.display = visible ? 'none' : 'block';
  const btnTop = document.getElementById('topMinimapBtn');
  const btnBottom = document.getElementById('minimapBtn');
  if (btnTop) btnTop.classList.toggle('active', el.style.display !== 'none');
  if (btnBottom) btnBottom.classList.toggle('active', el.style.display !== 'none');
  if (!visible) renderMinimap();
}

function toggleThumbRow() {
  const el = document.getElementById('thumbCarousel');
  if (!el) return;
  setThumbRowHidden(!appState.thumbRowHidden);
}

function setThumbRowHidden(hidden) {
  const el = document.getElementById('thumbCarousel');
  const btn = document.getElementById('thumbToggleBtn');
  appState.thumbRowHidden = !!hidden;
  if (el) el.style.display = appState.thumbRowHidden ? 'none' : 'block';
  if (btn) {
    btn.classList.toggle('active', appState.thumbRowHidden);
    btn.title = appState.thumbRowHidden ? '显示缩略图' : '隐藏缩略图';
  }
  if (!appState.thumbRowHidden) fitThumbRowToOneLine();
}
function renderMinimap() {
  const el = document.getElementById('minimap');
  if (!el) return;
  const items = appState.scenes.map(s => `
    <div class="minimap-item ${s.id === appState.currentScene?.id ? 'active' : ''}" data-id="${s.id}">
      <img class="minimap-thumb" src="${s.thumbnail}" alt="${s.name}">
      <div>${s.name}</div>
    </div>
  `).join('');
  el.innerHTML = items || '<div>暂无场景</div>';
  el.querySelectorAll('.minimap-item').forEach(item => {
    item.addEventListener('click', () => switchScene(item.dataset.id));
  });
}

function renderSceneDock() {
  const dock = document.getElementById('sceneDock');
  if (!dock) return;
  // 当侧栏折叠时显示横向场景预览，否则隐藏
  const isCollapsed = document.getElementById('sidebar')?.classList.contains('collapsed');
  dock.classList.toggle('hidden', !isCollapsed);
  if (!isCollapsed) return;
  dock.innerHTML = appState.scenes
    .filter(s => !s.isDefault)
    .map(s => `
      <div class="scene-dock-item ${s.id === appState.currentScene?.id ? 'active' : ''}" data-id="${s.id}">
        <img src="${s.thumbnail}" alt="${s.name}">
      </div>
    `).join('');
  dock.querySelectorAll('.scene-dock-item').forEach(el => {
    el.addEventListener('click', () => switchScene(el.dataset.id));
  });
  const toggle = document.getElementById('sceneDockToggle');
  if (toggle) {
    toggle.onclick = () => {
      const hidden = dock.classList.contains('hidden');
      dock.classList.toggle('hidden', !hidden);
      toggle.textContent = hidden ? '▼' : '▲';
    };
  }
}

function fitThumbRowToOneLine() {
  const container = document.getElementById('thumbCarousel');
  const list = document.getElementById('thumbList');
  if (!container || !list) return;
  list.style.transform = 'none';
  container.style.overflowX = 'hidden';
  const required = list.scrollWidth;
  const available = container.clientWidth;
  if (!available || !required) return;
  list.style.setProperty('--thumb-scale', '0.5');
  // 由于采用实际布局缩放，scrollWidth已按缩放后反映真实宽度，无需再用transform
  if (list.scrollWidth > available) {
    container.style.overflowX = 'auto';
    container.style.webkitOverflowScrolling = 'touch';
    container.style.justifyContent = 'flex-start';
    updateThumbScrollbar();
  } else {
    container.style.overflowX = 'hidden';
    container.style.justifyContent = 'center';
    updateThumbScrollbar();
  }
}

let thumbAutoScrollActive = false;
let thumbAutoScrollDir = 0;
let thumbAutoScrollRaf = 0;
let thumbScrollHideTimer = 0;
function handleThumbAutoScroll(e) {
  const container = document.getElementById('thumbCarousel');
  if (!container || !thumbAutoScrollActive) return;
  const rect = container.getBoundingClientRect();
  const EDGE = 40;
  if (e.clientX < rect.left + EDGE) {
    thumbAutoScrollDir = -1;
  } else if (e.clientX > rect.right - EDGE) {
    thumbAutoScrollDir = 1;
  } else {
    thumbAutoScrollDir = 0;
  }
}
function thumbAutoScrollLoop() {
  if (!thumbAutoScrollActive) return;
  const container = document.getElementById('thumbCarousel');
  if (container && thumbAutoScrollDir !== 0) {
    const SPEED = 20;
    container.scrollLeft += SPEED * thumbAutoScrollDir;
  }
  thumbAutoScrollRaf = requestAnimationFrame(thumbAutoScrollLoop);
}
function startThumbAutoScroll() {
  if (thumbAutoScrollActive) return;
  thumbAutoScrollActive = true;
  thumbAutoScrollRaf = requestAnimationFrame(thumbAutoScrollLoop);
}
function stopThumbAutoScroll() {
  thumbAutoScrollActive = false;
  thumbAutoScrollDir = 0;
  if (thumbAutoScrollRaf) cancelAnimationFrame(thumbAutoScrollRaf);
  thumbAutoScrollRaf = 0;
}

function updateThumbScrollbar() {
  const container = document.getElementById('thumbCarousel');
  const list = document.getElementById('thumbList');
  const bar = document.getElementById('thumbScrollBar');
  if (!container || !list || !bar) return;
  const cw = container.clientWidth;
  const sw = list.scrollWidth;
  if (!cw || !sw || sw <= cw) {
    bar.style.opacity = '0';
    return;
  }
  const handle = bar.querySelector('.thumb-scrollbar-thumb');
  const ratio = cw / sw;
  const handleW = Math.max(30, Math.floor(cw * ratio));
  const maxLeft = cw - handleW;
  const left = (container.scrollLeft / (sw - cw)) * maxLeft;
  handle.style.width = handleW + 'px';
  handle.style.transform = `translateX(${left}px)`;
  bar.style.opacity = '';
}

function showThumbScrollbar() {
  const bar = document.getElementById('thumbScrollBar');
  if (!bar) return;
  bar.classList.add('show');
  if (thumbScrollHideTimer) clearTimeout(thumbScrollHideTimer);
  thumbScrollHideTimer = setTimeout(() => bar.classList.remove('show'), 1200);
}

function renderThumbCarousel() {
  const list = document.getElementById('thumbList');
  if (!list) return;
  const scenes = appState.scenes.filter(s => !s.isDefault);
  if (scenes.length === 0) {
    list.innerHTML = '';
    return;
  }
  list.innerHTML = scenes.map(s => `
    <div class="thumb-item ${s.id === appState.currentScene?.id ? 'active' : ''}" data-id="${s.id}" draggable="true">
      <img src="${s.thumbnail || s.imageData}" alt="${s.name}" title="${s.name}">
    </div>
  `).join('');
  list.querySelectorAll('.thumb-item').forEach(el => {
    el.addEventListener('click', () => switchScene(el.dataset.id));
    el.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', el.dataset.id);
      el.classList.add('dragging');
      startThumbAutoScroll();
    });
    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
      el.classList.remove('drag-over');
      stopThumbAutoScroll();
    });
    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      el.classList.add('drag-over');
    });
    el.addEventListener('dragleave', () => {
      el.classList.remove('drag-over');
    });
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      const fromId = e.dataTransfer.getData('text/plain');
      const toId = el.dataset.id;
      if (!fromId || fromId === toId) return;
      const fromIdx = appState.scenes.findIndex(s => s.id === fromId);
      const toIdx = appState.scenes.findIndex(s => s.id === toId);
      if (fromIdx === -1 || toIdx === -1) return;
      const [moved] = appState.scenes.splice(fromIdx, 1);
      appState.scenes.splice(toIdx, 0, moved);
      renderThumbCarousel();
      updateSceneList();
      saveProject();
    });
  });
  const container = document.getElementById('thumbCarousel');
  if (container) {
    container.addEventListener('dragover', handleThumbAutoScroll);
    container.addEventListener('dragleave', () => thumbAutoScrollDir = 0);
    container.addEventListener('drop', () => stopThumbAutoScroll());
    container.addEventListener('scroll', () => { updateThumbScrollbar(); showThumbScrollbar(); });
    container.addEventListener('mouseenter', () => showThumbScrollbar());
    container.addEventListener('mouseleave', () => {
      const bar = document.getElementById('thumbScrollBar');
      if (bar) bar.classList.remove('show');
    });
  }
  fitThumbRowToOneLine();
}

let graphMode = false;
function toggleGraph() {
  graphMode = !graphMode;
  const el = document.getElementById('minimap');
  el.style.display = graphMode ? 'block' : el.style.display;
  if (graphMode) renderGraph();
}

function renderGraph() {
  const el = document.getElementById('minimap');
  if (!el) return;
  const scenes = appState.scenes.filter(s => !s.isDefault);
  const w = 260, h = 220;
  el.innerHTML = `<svg width="${w}" height="${h}"><defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L6,3 z" fill="#94a3b8"/></marker></defs></svg>`;
  const svg = el.querySelector('svg');
  const cx = w/2, cy = h/2, r = Math.min(w,h)/2 - 30;
  const positions = scenes.map((s,i) => {
    const angle = (2*Math.PI*i)/Math.max(1, scenes.length);
    return { id: s.id, x: cx + r*Math.cos(angle), y: cy + r*Math.sin(angle), name: s.name };
  });
  positions.forEach(p => {
    const node = document.createElementNS('http://www.w3.org/2000/svg','circle');
    node.setAttribute('cx', p.x);
    node.setAttribute('cy', p.y);
    node.setAttribute('r', 12);
    node.setAttribute('fill', p.id === appState.currentScene?.id ? '#2563eb' : '#64748b');
    node.style.cursor = 'pointer';
    node.addEventListener('click', () => switchScene(p.id));
    svg.appendChild(node);
    const label = document.createElementNS('http://www.w3.org/2000/svg','text');
    label.setAttribute('x', p.x + 14);
    label.setAttribute('y', p.y + 4);
    label.setAttribute('fill', '#fff');
    label.setAttribute('font-size', '12');
    label.textContent = p.name;
    svg.appendChild(label);
  });
  scenes.forEach(s => {
    s.hotspots.filter(h=>h.type==='link').forEach(hs => {
      const from = positions.find(p=>p.id===s.id);
      const to = positions.find(p=>p.id===hs.content);
      if (!from || !to) return;
      const line = document.createElementNS('http://www.w3.org/2000/svg','line');
      line.setAttribute('x1', from.x);
      line.setAttribute('y1', from.y);
      line.setAttribute('x2', to.x);
      line.setAttribute('y2', to.y);
      line.setAttribute('stroke', '#94a3b8');
      line.setAttribute('stroke-width', '2');
      line.setAttribute('marker-end','url(#arrow)');
      svg.insertBefore(line, svg.firstChild);
    });
  });
}

function scheduleIdleAutorotate() {
  if (!appState.viewer) return;
  const autorotate = Marzipano.autorotate({
    yawSpeed: (-0.3) * Math.PI / 180,
    targetPitch: 0,
    targetFov: Math.PI / 2
  });
  appState.viewer.setIdleMovement(3000, autorotate);
}

// New features implementation

function toggleGyroscope() {
  if (!appState.currentScene) {
    showNotification('⚠ 请先加载场景', 'warning');
    return;
  }
  
  appState.gyroEnabled = !appState.gyroEnabled;
  const btns = document.querySelectorAll('#gyroBtn, #topGyroBtn');
  
  if (appState.gyroEnabled) {
    btns.forEach(b => b && b.classList.add('active'));
    startGyroscope();
  } else {
    btns.forEach(b => b && b.classList.remove('active'));
    stopGyroscope();
  }
}

function startGyroscope() {
  if (window.DeviceOrientationEvent) {
    // Check if permission is required (iOS 13+)
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission()
        .then(response => {
          if (response === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation);
            showNotification('✓ 陀螺仪已启用');
          } else {
            showNotification('✗ 陀螺仪权限被拒绝', 'error');
            appState.gyroEnabled = false;
            const btn = document.getElementById('gyroBtn');
            if (btn) btn.classList.remove('active');
          }
        })
        .catch(console.error);
    } else {
      window.addEventListener('deviceorientation', handleOrientation);
      showNotification('✓ 陀螺仪已启用');
    }
  } else {
    showNotification('✗ 设备不支持陀螺仪', 'error');
    appState.gyroEnabled = false;
    const btn = document.getElementById('gyroBtn');
    if (btn) btn.classList.remove('active');
  }
}

function stopGyroscope() {
  window.removeEventListener('deviceorientation', handleOrientation);
  showNotification('✓ 陀螺仪已关闭');
}

function handleOrientation(event) {
  if (!appState.gyroEnabled || !appState.currentScene) return;
  
  // const alpha = event.alpha; // Z axis
  const beta = event.beta;   // X axis
  const gamma = event.gamma; // Y axis
  
  const view = appState.currentScene.view;
  const currentParams = view.parameters();
  
  if (beta !== null && gamma !== null) {
      view.setParameters({
        yaw: currentParams.yaw + (gamma * Math.PI / 180) * 0.05,
        pitch: Math.max(-Math.PI/2, Math.min(Math.PI/2, 
                currentParams.pitch + (beta - 90) * Math.PI / 180 * 0.05)),
        fov: currentParams.fov
      });
  }
}

function addBackgroundMusic() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'audio/*';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const audio = document.getElementById('bgMusic');
    if (audio) {
      const url = URL.createObjectURL(file);
      audio.src = url;
      audio.play()
        .then(() => {
          showNotification('🎵 音乐已添加并播放');
        })
        .catch(err => {
          console.error('播放失败:', err);
          showNotification('❌ 播放失败，请重试', 'error');
        });
    }
  };
  input.click();
}

function addTextHotspot() {
  if (!appState.currentScene) {
    showNotification('⚠ 请先选择一个场景', 'warning');
    return;
  }
  
  showHotspotModal();
  const typeSelect = document.getElementById('hotspotType');
  if (typeSelect) {
    typeSelect.value = 'info';
    typeSelect.dispatchEvent(new Event('change'));
  }
  setTimeout(() => {
    const titleInput = document.getElementById('hotspotTitle');
    if (titleInput) titleInput.focus();
  }, 100);
}

function takeScreenshot() {
    if (!appState.viewer) return;
    
    const canvas = document.querySelector('#pano canvas');
    if (canvas) {
        try {
            const dataUrl = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = 'screenshot-' + Date.now() + '.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            showNotification('📸 截图已保存');
        } catch (e) {
            console.error(e);
            showNotification('❌ 截图失败 (跨域限制?)', 'error');
        }
    } else {
        showNotification('❌ 无法获取画面', 'error');
    }
}

function toggleCompass() {
    // 重置视角到初始位置 (正北)
    if (appState.currentScene && appState.currentScene.view) {
        appState.currentScene.view.setParameters({
            yaw: 0,
            pitch: 0,
            fov: appState.currentScene.view.parameters().fov
        });
        showNotification('🧭 视角已重置');
    }
}

function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 24px;
    background: ${type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#10b981'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    font-size: 14px;
    font-weight: 500;
    transition: opacity 0.3s ease;
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

function initResizeHandlers() {
  const sidebar = document.getElementById('sidebar');
  const sidebarResizer = document.getElementById('sidebarResizer');
  const panel = document.getElementById('propertiesPanel');
  const panelResizer = document.getElementById('panelResizer');
  let dragging = null;
  const onMove = (e) => {
    if (dragging === 'sidebar') {
      const rect = sidebar.getBoundingClientRect();
      const newW = Math.max(200, Math.min(500, e.clientX - rect.left));
      sidebar.style.width = `${newW}px`;
    } else if (dragging === 'panel') {
      const rect = panel.getBoundingClientRect();
      const newW = Math.max(260, Math.min(560, rect.right - e.clientX));
      panel.style.width = `${newW}px`;
    }
  };
  const onUp = () => { dragging = null; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  if (sidebarResizer) sidebarResizer.addEventListener('mousedown', () => { dragging='sidebar'; document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp); });
  if (panelResizer) panelResizer.addEventListener('mousedown', () => { dragging='panel'; document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp); });
  if (sidebarResizer) sidebarResizer.addEventListener('dblclick', () => { const sidebar = document.getElementById('sidebar'); sidebar.classList.toggle('collapsed'); });
  const resetBtn = document.getElementById('resetHDRBtn');
  if (resetBtn) resetBtn.addEventListener('click', () => {
    const exposureEl = document.getElementById('exposureInput');
    const toneEl = document.getElementById('toneMappingSelect');
    if (exposureEl) exposureEl.value = '1';
    if (toneEl) toneEl.value = 'ACES';
    applyEXRSettings();
  });
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// 导出到全局作用域
window.deleteHotspot = deleteHotspot;
