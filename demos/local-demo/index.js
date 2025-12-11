'use strict';

// 创建一个canvas纹理函数
function createColorTexture(color, face) {
  var canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  var ctx = canvas.getContext('2d');
  
  // 背景色
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 512, 512);
  
  // 添加网格
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 2;
  for (var i = 0; i < 512; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }
  
  // 添加文字标签
  ctx.fillStyle = 'white';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(face, 256, 256);
  
  return canvas;
}

// 创建viewer
var viewer = new Marzipano.Viewer(document.getElementById('pano'));

// 为每个面创建不同颜色的canvas
var faces = {
  f: { color: '#FF6B6B', name: '前 (Front)' },
  b: { color: '#4ECDC4', name: '后 (Back)' },
  l: { color: '#45B7D1', name: '左 (Left)' },
  r: { color: '#FFA07A', name: '右 (Right)' },
  u: { color: '#98D8C8', name: '上 (Up)' },
  d: { color: '#C7CEEA', name: '下 (Down)' }
};

var canvases = {};
for (var face in faces) {
  canvases[face] = createColorTexture(faces[face].color, faces[face].name);
}

// 创建source - 使用canvas元素
var source = new Marzipano.ImageUrlSource(function(tile) {
  return { element: canvases[tile.face] };
});

// 创建geometry
var geometry = new Marzipano.CubeGeometry([{ tileSize: 512, size: 512 }]);

// 创建view
var limiter = Marzipano.RectilinearView.limit.traditional(1024, 100 * Math.PI / 180);
var view = new Marzipano.RectilinearView({ yaw: 0, pitch: 0 }, limiter);

// 创建scene
var scene = viewer.createScene({
  source: source,
  geometry: geometry,
  view: view,
  pinFirstLevel: true
});

// 显示scene
scene.switchTo();
