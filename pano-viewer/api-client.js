(()=>{
  const BASE = '';
  
  // 带重试的 fetch 封装（移动端网络不稳定时使用）
  async function fetchWithRetry(url, options = {}, maxRetries = 3) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url, options);
        return response;
      } catch (err) {
        lastError = err;
        console.warn(`请求失败 (${i + 1}/${maxRetries}):`, url, err.message);
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
      
      // 上传使用重试机制
      let lastError;
      const maxRetries = 3;
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          if (onProgress && attempt > 0) onProgress(0);
          console.log(`📤 上传尝试 ${attempt + 1}/${maxRetries}...`);
          
          const res = await fetch(`${BASE}/api/projects/${projectId}/upload`, {
            method: 'POST',
            headers: token ? { 'X-Auth-Token': token } : undefined,
            body: form
          });
          
          if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
          
          const json = await res.json();
          if (onProgress) onProgress(100);
          console.log(`✅ 上传成功`);
          return json;
        } catch (err) {
          lastError = err;
          console.warn(`⚠ 上传失败 (${attempt + 1}/${maxRetries}):`, err.message);
          if (attempt < maxRetries - 1) {
            await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
          }
        }
      }
      throw lastError;
    },

    getAssetUrl(projectId, fileName) {
      if (!projectId || !fileName) return null;
      if (fileName.startsWith('data:') || fileName.startsWith('http') || fileName.startsWith('file:')) return fileName;
      const baseUrl = window.location.origin;
      return `${baseUrl}${BASE}/projects/${projectId}/assets/${encodeURIComponent(fileName)}`;
    },
    
    getAuthInfo: async () => {
      const res = await fetchWithRetry(`${BASE}/api/auth-info`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    }
  };

  window.apiClient = api;
})();
