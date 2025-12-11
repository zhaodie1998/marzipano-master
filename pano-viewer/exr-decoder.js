// EXR 解码器模块
// 使用 Three.js EXRLoader 将 EXR 文件转换为标准图像格式，包含离线CDN加载与容错

// 等待 THREE.js 加载完成的辅助函数（含超时）
function waitForTHREE(timeoutMs = 8000) {
  return new Promise((resolve) => {
    const isReady = () => (
      window.threeJSReady &&
      window.THREE &&
      (typeof window.createEXRLoader === 'function' ||
       typeof window.getEXRLoaderClass === 'function' ||
       (window.THREE && window.THREE.EXRLoader))
    );

    if (isReady()) {
      resolve(true);
      return;
    }

    ensureThreeAndEXR();
    const onReady = () => resolve(true);
    window.addEventListener('threeJSReady', onReady, { once: true });

    setTimeout(() => {
      window.removeEventListener('threeJSReady', onReady);
      resolve(isReady());
    }, timeoutMs);
  });
}

async function loadScript(url, attrs = {}) {
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = url;
    Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}

async function ensureThreeAndEXR() {
  // 简化为仅本地模块加载，避免外链报错日志
  if (window.THREE && (window.createEXRLoader || window.getEXRLoaderClass || (THREE && THREE.EXRLoader))) {
    window.threeJSReady = true;
    window.dispatchEvent(new Event('threeJSReady'));
    return true;
  }
  // 加载本地 shim（ES Module）
  try {
    const v = Date.now();
    await import(`./libs/exr-shim.js?v=${v}`);
  } catch (e1) {
    try {
      const v2 = Date.now();
      await import(`/pano-viewer/libs/exr-shim.js?v=${v2}`);
    } catch (e2) {
      return false;
    }
  }
  window.threeJSReady = !!(window.THREE && (window.createEXRLoader || window.getEXRLoaderClass || (THREE && THREE.EXRLoader)));
  window.dispatchEvent(new Event('threeJSReady'));
  return window.threeJSReady;
}

const EXRDecoder = {
  // 检查是否为 EXR 文件
  isEXRFile(filename) {
    return /\.exr$/i.test(filename);
  },

  // 解码 EXR 文件
  async decodeEXR(file, onProgress) {
    // 先等待 THREE.js 加载完成
    const ready = await waitForTHREE(12000);
    if (!ready) {
      throw new Error('Three.js 未加载');
    }
    
    return new Promise((resolve, reject) => {
      console.log(`开始解码 EXR 文件: ${file.name}, 大小: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      
      // 再次检查 Three.js 是否加载
      if (typeof THREE === 'undefined') {
        reject(new Error('Three.js 未加载'));
        return;
      }

      // 检查 EXRLoader 是否可用
      if (
        typeof window.createEXRLoader !== 'function' &&
        typeof window.getEXRLoaderClass !== 'function' &&
        typeof THREE.EXRLoader === 'undefined'
      ) {
        reject(new Error('EXRLoader 未加载'));
        return;
      }
      
      console.log('✅ THREE.js 和 EXRLoader 已就绪，开始解码...');

      const reader = new FileReader();
      
      reader.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = (e.loaded / e.total) * 50; // 前50%是读取
          onProgress(progress, '读取 EXR 文件...');
        }
      };

      reader.onload = (e) => {
        try {
          console.log('EXR 文件读取完成，开始解码...');
          
          if (onProgress) onProgress(50, '解析 EXR 数据...');
          
          const arrayBuffer = e.target.result;
          
          // 构造 Loader（优先使用工厂，以避免只读错误）
          let loader;
          if (typeof window.createEXRLoader === 'function') {
            loader = window.createEXRLoader();
          } else if (typeof window.getEXRLoaderClass === 'function') {
            const LoaderClass = window.getEXRLoaderClass();
            loader = new LoaderClass();
          } else {
            loader = new THREE.EXRLoader();
          }
          
          // 解析 EXR 数据（同步 parse API）
          let exrData;
          try {
            exrData = loader.parse(arrayBuffer);
          } catch (err) {
            console.error('解析 EXR 时出错:', err);
            reject(err);
            return;
          }
          
          try {
              // 检查返回的数据结构
              console.log('EXR 解析返回:', exrData);
              
              // 提取宽度、高度和数据
              const width = exrData.width;
              const height = exrData.height;
              const data = exrData.data;
              
              if (!width || !height || !data) {
                console.error('EXR 数据缺少必要字段:', exrData);
                reject(new Error('EXR 数据格式不完整'));
                return;
              }
              
              console.log('EXR 解析成功，纹理尺寸:', width, 'x', height);
              console.log('数据类型:', data.constructor.name, '长度:', data.length);
              
              // 创建 THREE.DataTexture 从原始数据
              const texture = new THREE.DataTexture(
                data,
                width,
                height,
                exrData.format || THREE.RGBAFormat,
                exrData.type || THREE.HalfFloatType
              );
              texture.needsUpdate = true;
              texture.colorSpace = exrData.colorSpace || 'srgb-linear';
              
              console.log('✅ DataTexture 创建成功');
              
              if (onProgress) onProgress(75, '转换为标准格式...');
              
              // 将纹理渲染到 Canvas
              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              
              // 使用 Three.js 渲染
              const scene = new THREE.Scene();
              const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
              
              // 创建一个平面来显示纹理
              const geometry = new THREE.PlaneGeometry(2, 2);
              const material = new THREE.MeshBasicMaterial({
                map: texture,
                toneMapped: true, // 启用色调映射以处理 HDR
                side: THREE.DoubleSide
              });
              const mesh = new THREE.Mesh(geometry, material);
              scene.add(mesh);
              
              // 创建渲染器
              const renderer = new THREE.WebGLRenderer({
                canvas: canvas,
                antialias: false,
                preserveDrawingBuffer: true
              });
              renderer.setSize(canvas.width, canvas.height);
              try { renderer.outputColorSpace = THREE.SRGBColorSpace; } catch (e2) {
                try { renderer.outputEncoding = THREE.sRGBEncoding; } catch (e3) {}
              }
              
              // 设置曝光和色调映射
              renderer.toneMappingExposure = 1.0;
              renderer.toneMapping = THREE.ACESFilmicToneMapping;
              
              // 渲染
              renderer.render(scene, camera);
              
              console.log('EXR 渲染到 Canvas 完成');
              
              if (onProgress) onProgress(90, '生成图像数据...');
              
              // 转换为 DataURL (使用 JPEG 以减小大小)
              const dataURL = canvas.toDataURL('image/jpeg', 0.92);
              
              console.log(`✅ EXR 解码完成，输出大小: ${(dataURL.length / 1024 / 1024).toFixed(2)}MB`);
              
              // 清理资源
              geometry.dispose();
              material.dispose();
              texture.dispose();
              renderer.dispose();
              
              if (onProgress) onProgress(100, 'EXR 解码完成');
              
              resolve({ dataURL, buffer: arrayBuffer });
              
          } catch (error) {
            console.error('渲染 EXR 纹理时出错:', error);
            reject(error);
          }
          
        } catch (error) {
          console.error('解析 EXR 文件时出错:', error);
          reject(error);
        }
      };

      reader.onerror = (error) => {
        console.error('读取 EXR 文件失败:', error);
        reject(new Error('读取 EXR 文件失败'));
      };

      // 以 ArrayBuffer 方式读取文件
      reader.readAsArrayBuffer(file);
    });
  },

  async renderEXRFromBuffer(arrayBuffer, options = {}, onProgress) {
    const ready = await waitForTHREE();
    if (!ready) {
      throw new Error('Three.js 未加载');
    }
    return new Promise((resolve, reject) => {
      try {
        if (onProgress) onProgress(10, '解析 EXR 数据...');
        let loader;
        if (typeof window.createEXRLoader === 'function') {
          loader = window.createEXRLoader();
        } else if (typeof window.getEXRLoaderClass === 'function') {
          const LoaderClass = window.getEXRLoaderClass();
          loader = new LoaderClass();
        } else {
          loader = new THREE.EXRLoader();
        }
        const exrData = loader.parse(arrayBuffer);
        const width = exrData.width;
        const height = exrData.height;
        const data = exrData.data;
        if (!width || !height || !data) {
          reject(new Error('EXR 数据格式不完整'));
          return;
        }
        const texture = new THREE.DataTexture(
          data,
          width,
          height,
          exrData.format || THREE.RGBAFormat,
          exrData.type || THREE.HalfFloatType
        );
        texture.needsUpdate = true;
        texture.colorSpace = exrData.colorSpace || 'srgb-linear';
        if (onProgress) onProgress(40, '转换为标准格式...');
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const geometry = new THREE.PlaneGeometry(2, 2);
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          toneMapped: true,
          side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
        const renderer = new THREE.WebGLRenderer({
          canvas: canvas,
          antialias: false,
          preserveDrawingBuffer: true
        });
        renderer.setSize(canvas.width, canvas.height);
        try { renderer.outputColorSpace = THREE.SRGBColorSpace; } catch (e2) {
          try { renderer.outputEncoding = THREE.sRGBEncoding; } catch (e3) {}
        }
        const tone = (options.toneMapping || 'ACES').toUpperCase();
        renderer.toneMappingExposure = typeof options.exposure === 'number' ? options.exposure : 1.0;
        renderer.toneMapping = tone === 'REINHARD' ? THREE.ReinhardToneMapping : tone === 'LINEAR' ? THREE.LinearToneMapping : THREE.ACESFilmicToneMapping;
        renderer.render(scene, camera);
        if (onProgress) onProgress(80, '生成图像数据...');
        const dataURL = canvas.toDataURL('image/jpeg', 0.92);
        geometry.dispose();
        material.dispose();
        texture.dispose();
        renderer.dispose();
        if (onProgress) onProgress(100, 'EXR 重新渲染完成');
        resolve(dataURL);
      } catch (error) {
        reject(error);
      }
    });
  },

  // 批量处理文件（包括 EXR 和普通图片）
  async processFile(file, onProgress) {
    if (this.isEXRFile(file.name)) {
      console.log(`检测到 EXR 文件: ${file.name}`);
      return await this.decodeEXR(file, onProgress);
    } else {
      // 普通图片文件，直接读取为 DataURL
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onprogress = (e) => {
          if (e.lengthComputable && onProgress) {
            const progress = (e.loaded / e.total) * 100;
            onProgress(progress, '读取图片...');
          }
        };
        
        reader.onload = (e) => {
          resolve({ dataURL: e.target.result, buffer: null });
        };
        
        reader.onerror = (error) => {
          reject(error);
        };
        
        reader.readAsDataURL(file);
      });
    }
  }
};

// 导出到全局作用域
window.EXRDecoder = EXRDecoder;

console.log('✅ EXR 解码器已加载');
