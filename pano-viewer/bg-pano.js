// 初始化背景全景图
(function() {
  // 查找或创建背景容器
  let panoElement = document.getElementById('pano-bg');
  if (!panoElement) {
    panoElement = document.createElement('div');
    panoElement.id = 'pano-bg';
    panoElement.style.position = 'fixed';
    panoElement.style.top = '0';
    panoElement.style.left = '0';
    panoElement.style.width = '100%';
    panoElement.style.height = '100%';
    panoElement.style.zIndex = '0';
    document.body.appendChild(panoElement);
  }

  // Marzipano 查看器选项
  const viewerOpts = {
    controls: {
      mouseViewMode: 'drag'    // 允许鼠标拖拽查看
    }
  };

  // 初始化查看器
  const viewer = new Marzipano.Viewer(panoElement, viewerOpts);

  // 定义几何形状（使用单层级，假定单张图片覆盖全景）
  // 注意：为了让单张图片正常工作，我们需要定义一个足够大的瓦片大小，
  // 使其被视为一个单一的瓦片。
  const geometry = new Marzipano.EquirectGeometry([{ width: 4000 }]);

  // 定义视图限制
  const limiter = Marzipano.RectilinearView.limit.traditional(4000, 100*Math.PI/180);
  const view = new Marzipano.RectilinearView({ yaw: 0, pitch: 0, fov: Math.PI / 2 }, limiter);

  // 定义背景图片路径 - 使用风景全景图
  var bgImage = 'img/nature-pano.jpg';

  // 创建源（始终返回同一张背景图）
  // Marzipano 通常期望瓦片，但我们可以通过忽略坐标来hack它
  const source = new Marzipano.ImageUrlSource(function(tile) {
    return { url: bgImage };
  });

  // 创建场景
  const scene = viewer.createScene({
    source: source,
    geometry: geometry,
    view: view,
    pinFirstLevel: true
  });

  // 切换到场景
  scene.switchTo();

  // 自动旋转
  const autorotate = Marzipano.autorotate({
    yawSpeed: 0.03,         // 旋转速度
    targetPitch: 0,         // 目标俯仰角
    targetFov: Math.PI/2    // 目标视场角
  });
  
  // 启动自动旋转（用户交互时会暂停）
  viewer.startMovement(autorotate);
  viewer.setIdleMovement(3000, autorotate); // 3秒无操作后恢复旋转

})();
