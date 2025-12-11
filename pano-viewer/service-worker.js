// Service Worker for Marzipano Pro Editor
// Version: 1.0.0

const CACHE_NAME = 'marzipano-pro-v1.0.0';
const RUNTIME_CACHE = 'marzipano-runtime-v1.0.0';

// 需要缓存的静态资源
const STATIC_ASSETS = [
  '/pano-viewer/index-pro.html',
  '/pano-viewer/style-pro.css',
  '/pano-viewer/style-pro-addon.css',
  '/pano-viewer/app-pro.js',
  '/pano-viewer/app-pro-features.js',
  '/pano-viewer/exr-decoder.js',
  '/build/marzipano.js',
  '/pano-viewer/favicon.svg'
];

// 安装事件 - 缓存静态资源
self.addEventListener('install', (event) => {
  console.log('[Service Worker] 安装中...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] 缓存静态资源');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] 安装完成');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Service Worker] 安装失败:', error);
      })
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] 激活中...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log('[Service Worker] 删除旧缓存:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] 激活完成');
        return self.clients.claim();
      })
  );
});

// 请求拦截 - 缓存策略
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 只处理同源请求
  if (url.origin !== location.origin) {
    // CDN资源使用网络优先策略
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 成功则缓存CDN资源
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // 网络失败时尝试从缓存获取
          return caches.match(request);
        })
    );
    return;
  }
  
  // HTML文件使用网络优先策略
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }
  
  // 静态资源使用缓存优先策略
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // 后台更新缓存
          fetch(request).then((response) => {
            if (response && response.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, response);
              });
            }
          });
          return cachedResponse;
        }
        
        // 缓存未命中，从网络获取
        return fetch(request)
          .then((response) => {
            // 只缓存成功的响应
            if (!response || response.status !== 200) {
              return response;
            }
            
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
            
            return response;
          });
      })
  );
});

// 消息处理
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});

// 定期清理过期缓存
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'clear-old-cache') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        const oldCaches = cacheNames.filter((name) => 
          name !== CACHE_NAME && name !== RUNTIME_CACHE
        );
        return Promise.all(
          oldCaches.map((name) => caches.delete(name))
        );
      })
    );
  }
});
