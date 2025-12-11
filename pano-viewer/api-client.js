(()=>{
  const BASE = '';
  const api = {
    _headers() {
      const token = localStorage.getItem('auth_token');
      const h = { 'Content-Type': 'application/json' };
      if (token) h['X-Auth-Token'] = token;
      return h;
    },

    getProjects: async () => {
      const res = await fetch(`${BASE}/api/projects`, { headers: api._headers() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },

    createProject: async (name) => {
      const res = await fetch(`${BASE}/api/projects`, {
        method: 'POST',
        headers: api._headers(),
        body: JSON.stringify({ name })
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },

    deleteProject: async (projectId) => {
      const res = await fetch(`${BASE}/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: api._headers()
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },

    getProject: async (projectId) => {
      const res = await fetch(`${BASE}/api/projects/${projectId}`, { headers: api._headers() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },

    saveProject: async (projectId, data) => {
      const res = await fetch(`${BASE}/api/projects/${projectId}`, {
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
      return `${BASE}/projects/${projectId}/assets/${encodeURIComponent(fileName)}`;
    }
  };

  window.apiClient = api;
})();

