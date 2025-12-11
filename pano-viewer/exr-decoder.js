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
  _worker: null,
  _reqId: 0,
  _ensureWorker() {
    if (this._worker) return this._worker;
    try {
      this._worker = new Worker('./workers/exrWorker.js', { type: 'module' });
    } catch (e) {
      this._worker = null;
    }
    return this._worker;
  },
  _decodeViaWorker(arrayBuffer, onProgress, options = {}) {
    return new Promise((resolve, reject) => {
      const w = EXRDecoder._ensureWorker();
      if (!w) return reject(new Error('Worker not available'));
      const id = ++EXRDecoder._reqId;
      const onMsg = (ev) => {
        const msg = ev.data || {};
        if (msg.id !== id) return;
        w.removeEventListener('message', onMsg);
        if (msg.ok) {
          try {
            const width = msg.width, height = msg.height;
            const rgba = new Uint8ClampedArray(msg.rgba);
            const imgData = new ImageData(rgba, width, height);
            const temp = document.createElement('canvas');
            temp.width = width; temp.height = height;
            const tctx = temp.getContext('2d');
            tctx.putImageData(imgData, 0, 0);
            const canvas = document.createElement('canvas');
            const maxW = 2048;
            const scale = Math.min(1, maxW / width);
            canvas.width = Math.max(1, Math.round(width * scale));
            canvas.height = Math.max(1, Math.round(height * scale));
            const ctx = canvas.getContext('2d');
            ctx.drawImage(temp, 0, 0, canvas.width, canvas.height);
            const dataURL = canvas.toDataURL('image/jpeg', 0.9);
            resolve({ dataURL, buffer: arrayBuffer });
          } catch (e) {
            reject(e);
          }
        } else {
          reject(new Error(msg.error || 'Worker failed'));
        }
      };
      w.addEventListener('message', onMsg);
      try { if (onProgress) onProgress(10, '解析 EXR 数据...'); } catch {}
      w.postMessage({ id, action: 'decode', buffer: arrayBuffer, options }, [arrayBuffer]);
    });
  },

  // 解码 EXR 文件
  async decodeEXR(file, onProgress) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = (e.loaded / e.total) * 40;
          onProgress(progress, '读取 EXR 文件...');
        }
      };
      reader.onload = async (e) => {
        const arrayBuffer = e.target.result;
        try {
          const res = await EXRDecoder._decodeViaWorker(arrayBuffer, onProgress);
          resolve(res);
        } catch (workerErr) {
          console.warn('Worker 解码失败，尝试回退:', workerErr);
          try {
            const ready = await waitForTHREE(8000);
            if (!ready) throw new Error('Three.js 未加载');
            if (onProgress) onProgress(60, '解析 EXR 数据...');
            let loader;
            if (typeof window.createEXRLoader === 'function') loader = window.createEXRLoader();
            else if (typeof window.getEXRLoaderClass === 'function') loader = new (window.getEXRLoaderClass())();
            else loader = new THREE.EXRLoader();
            const exrData = loader.parse(arrayBuffer);
            const width = exrData.width, height = exrData.height;
            const canvas = document.createElement('canvas');
            const maxW = 2048;
            const scale = Math.min(1, maxW / width);
            canvas.width = Math.max(1, Math.round(width * scale));
            canvas.height = Math.max(1, Math.round(height * scale));
            const scene = new THREE.Scene();
            const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
            const geometry = new THREE.PlaneGeometry(2, 2);
            const tex = new THREE.DataTexture(exrData.data, width, height, exrData.format || THREE.RGBAFormat, exrData.type || THREE.HalfFloatType);
            tex.needsUpdate = true;
            const material = new THREE.MeshBasicMaterial({ map: tex, toneMapped: true });
            const mesh = new THREE.Mesh(geometry, material);
            scene.add(mesh);
            const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
            renderer.setSize(canvas.width, canvas.height);
            try { renderer.outputColorSpace = THREE.SRGBColorSpace; } catch {}
            renderer.toneMappingExposure = 1.0;
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.render(scene, camera);
            const dataURL = canvas.toDataURL('image/jpeg', 0.9);
            geometry.dispose(); material.dispose(); tex.dispose(); renderer.dispose();
            if (onProgress) onProgress(100, 'EXR 解码完成');
            resolve({ dataURL, buffer: arrayBuffer });
          } catch (fatal) {
            reject(fatal);
          }
        }
      };
      reader.onerror = () => reject(new Error('读取 EXR 文件失败'));
      reader.readAsArrayBuffer(file);
    });
  },

  async renderEXRFromBuffer(arrayBuffer, options = {}, onProgress) {
    try {
      const res = await EXRDecoder._decodeViaWorker(arrayBuffer, onProgress, options);
      return res.dataURL;
    } catch (workerErr) {
      const ready = await waitForTHREE();
      if (!ready) throw new Error('Three.js 未加载');
      return new Promise((resolve, reject) => {
        try {
          let loader;
          if (typeof window.createEXRLoader === 'function') loader = window.createEXRLoader();
          else if (typeof window.getEXRLoaderClass === 'function') loader = new (window.getEXRLoaderClass())();
          else loader = new THREE.EXRLoader();
          const exrData = loader.parse(arrayBuffer);
          const width = exrData.width, height = exrData.height;
          const canvas = document.createElement('canvas');
          const maxW = 2048;
          const scale = Math.min(1, maxW / width);
          canvas.width = Math.max(1, Math.round(width * scale));
          canvas.height = Math.max(1, Math.round(height * scale));
          const scene = new THREE.Scene();
          const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
          const geometry = new THREE.PlaneGeometry(2, 2);
          const tex = new THREE.DataTexture(exrData.data, width, height, exrData.format || THREE.RGBAFormat, exrData.type || THREE.HalfFloatType);
          tex.needsUpdate = true;
          const material = new THREE.MeshBasicMaterial({ map: tex, toneMapped: true });
          const mesh = new THREE.Mesh(geometry, material);
          scene.add(mesh);
          const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
          renderer.setSize(canvas.width, canvas.height);
          try { renderer.outputColorSpace = THREE.SRGBColorSpace; } catch {}
          const tone = (options.toneMapping || 'ACES').toUpperCase();
          renderer.toneMappingExposure = typeof options.exposure === 'number' ? options.exposure : 1.0;
          renderer.toneMapping = tone === 'REINHARD' ? THREE.ReinhardToneMapping : tone === 'LINEAR' ? THREE.LinearToneMapping : THREE.ACESFilmicToneMapping;
          renderer.render(scene, camera);
          const dataURL = canvas.toDataURL('image/jpeg', 0.9);
          geometry.dispose(); material.dispose(); tex.dispose(); renderer.dispose();
          resolve(dataURL);
        } catch (e) { reject(e); }
      });
    }
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
