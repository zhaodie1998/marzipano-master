(()=>{
  const BASE = '';
  
  // 带重试的 fetch 封装（移动端网络不稳定时使用）
  async function fetchWithRetry(url, options = {}, maxRetries = 3) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url, {
          ...options,
          // 移动端超时设置
          signal: options.signal || AbortSignal.timeout(30000)
        });
        return response;
      } catch (err) {
        lastError = err;
        console.warn(`请求失败 (${i + 1}/${maxRetries}):`, url, err.message);
        
        // 如果是用户主动中止，不重试
        if (err.name === 'AbortError' && options.signal) {
          throw err;
        }
        
        // 等待后重试
        if (i < maxRetries - 1) {
          await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }
      }
    }
    throw lastError;
  }
  
  const api = {
    _headers() {
      const token = localStorage.getItem('auth_token');
      const h = { 'Content-Type': 'application/json' };
      if (token) h['X-Auth-Token'] = token;
      return h;
    },

    getProjects: async () => {
      const res = await fetchWithRetry(`${BASE}/api/projects`, { headers: api._headers() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },

    createProject: async (name) => {
      const res = await fetchWithRetry(`${BASE}/api/projects`, {
        method: 'POST',
        headers: api._headers(),
        body: JSON.stringify({ name })
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },

    deleteProject: async (projectId) => {
      const res = await fetchWithRetry(`${BASE}/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: api._headers()
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },

    getProject: async (projectId) => {
      const res = await fetchWithRetry(`${BASE}/api/projects/${projectId}`, { headers: api._headers() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },

    saveProject: async (projectId, data) => {
      const res = await fetchWithRetry(`${BASE}/api/projects/${projectId}`, {
        method: 'PUT',
        headers: api._headers(),
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },

    uploadImages: async (projectId, files, onProgress) => {
      const form = new FormData();
      files.forEach(f => form.append('images', f, f.name));
      const token = localStorage.getItem('auth_token');
      const controller = new AbortController();
      const res = await fetch(`${BASE}/api/projects/${projectId}/upload`, {
        method: 'POST',
        headers: token ? { 'X-Auth-Token': token } : undefined,
        body: form,
        signal: controller.signal
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      if (onProgress) onProgress(100);
      return json;
    },

    getAssetUrl(projectId, fileName) {
      if (!projectId || !fileName) return null;
      if (fileName.startsWith('data:') || fileName.startsWith('http') || fileName.startsWith('file:')) return fileName;
      
      // 确保文件名正确编码（支持中文和特殊字符）
      const encodedFileName = encodeURIComponent(fileName);
      
      // 构建完整 URL（移动端需要绝对路径）
      const baseUrl = window.location.origin;
      const url = `${baseUrl}${BASE}/projects/${projectId}/assets/${encodedFileName}`;
      
      console.log(`📎 资源 URL: ${url}`);
      return url;
    },
    
    // 移动端图片预加载（使用 fetch + blob）
    async preloadImage(url) {
      try {
        const response = await fetch(url, {
          mode: 'cors',
          credentials: 'omit',
          cache: 'force-cache'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      } catch (err) {
        console.error('预加载图片失败:', url, err);
        return url; // 回退到原始 URL
      }
    }
  };

  window.apiClient = api;
})();

