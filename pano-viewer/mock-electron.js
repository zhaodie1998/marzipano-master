/**
 * Mock Electron API for Browser Preview
 * Simulates the IPC bridge using IndexedDB and Blob URLs
 * Supports persistent storage of large assets across page reloads
 */

(function() {
  if (window.electronAPI) return; // Don't overwrite if real Electron exists

  console.warn('⚠️ Running in Browser Preview Mode with Mock Electron API');

  const PROJECTS_KEY = 'pano_editor_projects';
  const DB_NAME = 'PanoEditorDB';
  const DB_VERSION = 1;
  const STORE_ASSETS = 'assets';

  // IndexedDB Helper
  const dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      console.error('IndexedDB error:', event.target.error);
      reject(event.target.error);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_ASSETS)) {
        db.createObjectStore(STORE_ASSETS, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
  });

  async function getAssetFromDB(key) {
    const db = await dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_ASSETS], 'readonly');
      const store = transaction.objectStore(STORE_ASSETS);
      const request = store.get(key);
      
      request.onsuccess = () => resolve(request.result ? request.result.data : null);
      request.onerror = () => reject(request.error);
    });
  }

  async function saveAssetToDB(key, data) {
    const db = await dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_ASSETS], 'readwrite');
      const store = transaction.objectStore(STORE_ASSETS);
      const request = store.put({ key, data });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  function getProjectsFromStorage() {
    try {
      return JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveProjectsToStorage(projects) {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  }

  window.electronAPI = {
    // Project Management
    getProjects: async () => {
      const projects = getProjectsFromStorage().sort((a, b) => b.lastModified - a.lastModified);
      
      // Sanitize thumbnails: replace stale blob URLs with persistent data URLs
      const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
        try {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        } catch (e) { reject(e); }
      });
      
      for (let i = 0; i < projects.length; i++) {
        const p = projects[i];
        if (!p || !p.path) continue;
        const needsFix = !p.thumbnail || (typeof p.thumbnail === 'string' && p.thumbnail.startsWith('blob:'));
        if (!needsFix) continue;
        try {
          const data = JSON.parse(localStorage.getItem(`project_data_${p.path}`) || 'null');
          let thumb = null;
          if (data && data.scenes && data.scenes.length > 0) {
            const s0 = data.scenes[0];
            if (s0 && s0.thumbnail) {
              thumb = s0.thumbnail;
            } else {
              let f = s0.imageFile || s0.imageData || '';
              if (typeof f === 'string' && f.toLowerCase().endsWith('.exr')) {
                f = f.replace(/\.[^/.]+$/, '') + '.jpg';
              }
              const assetKey = `${p.path}/assets/${f}`;
              const stored = await getAssetFromDB(assetKey);
              if (stored) {
                if (typeof stored === 'string') {
                  thumb = stored;
                } else {
                  thumb = await blobToDataUrl(stored);
                }
              }
            }
          }
          if (thumb) {
            p.thumbnail = thumb;
          } else {
            p.thumbnail = 'img/nature-pano.jpg';
          }
        } catch (e) {
          p.thumbnail = 'img/nature-pano.jpg';
        }
      }
      
      saveProjectsToStorage(projects);
      return projects;
    },

    createProject: async (name) => {
      const projects = getProjectsFromStorage();
      if (projects.some(p => p.name === name)) {
        return { success: false, error: 'Project already exists' };
      }

      const newProject = {
        name: name,
        path: `mock://${name}`, // Virtual path
        created: Date.now(),
        lastModified: Date.now(),
        thumbnail: null
      };

      projects.push(newProject);
      saveProjectsToStorage(projects);
      
      // Initialize project data
      localStorage.setItem(`project_data_${newProject.path}`, JSON.stringify({
        name,
        created: Date.now(),
        lastModified: Date.now(),
        thumbnail: null,
        scenes: []
      }));

      return { success: true, path: newProject.path };
    },

    deleteProject: async (path) => {
      let projects = getProjectsFromStorage();
      projects = projects.filter(p => p.path !== path);
      saveProjectsToStorage(projects);
      localStorage.removeItem(`project_data_${path}`);
      return true;
    },

    // File Operations
    saveProjectData: async (path, data) => {
      const key = `project_data_${path}`;
      const existing = JSON.parse(localStorage.getItem(key) || '{}');
      const merged = { ...existing, ...data, lastModified: Date.now() };
      localStorage.setItem(key, JSON.stringify(merged));
      
      // Update last modified in project list
      const projects = getProjectsFromStorage();
      const pIndex = projects.findIndex(p => p.path === path);
      if (pIndex !== -1) {
        projects[pIndex].lastModified = Date.now();
        if (data.thumbnail) projects[pIndex].thumbnail = data.thumbnail;
        saveProjectsToStorage(projects);
      }
      return true;
    },

    loadProjectData: async (path) => {
      return JSON.parse(localStorage.getItem(`project_data_${path}`) || 'null');
    },

    saveAsset: async (projectPath, buffer, fileName) => {
      // Create a Blob from the buffer
      const blob = new Blob([buffer]);
      // Convert Blob to DataURL for storage (IndexedDB handles Blobs well, but DataURL is safer for cross-browser mock)
      // Actually IndexedDB can store Blobs directly in modern browsers.
      // But let's stick to DataURL for consistency with existing code expecting strings if possible,
      // or just store Blob and return object URL.
      
      // To keep it simple and robust: Store Blob in DB, return a Blob URL.
      // But Blob URLs are revoked on page unload.
      // So we need to store the Blob in DB. 
      // When getAssetUrl is called, we retrieve Blob from DB and create a new URL.
      
      const assetKey = `${projectPath}/assets/${fileName}`;
      await saveAssetToDB(assetKey, blob);
      console.log(`[Mock] Saved asset ${fileName} to IndexedDB`);
      return fileName;
    },

    getAssetUrl: async (projectPath, fileName) => {
      if (fileName.startsWith('blob:') || fileName.startsWith('data:')) return fileName;
      if (fileName.startsWith('http')) return fileName;
      
      const assetKey = `${projectPath}/assets/${fileName}`;
      try {
        const blob = await getAssetFromDB(assetKey);
        if (blob) {
          // If it's a string (DataURL), return it. If Blob, create URL.
          if (typeof blob === 'string') return blob;
          return URL.createObjectURL(blob);
        }
      } catch (e) {
        console.error('Failed to load asset from DB', e);
      }
      
      // Return a placeholder or empty if not found
      console.warn(`[Mock] Asset not found: ${fileName}`);
      return '';
    },

    saveDataUrlAsset: async (projectPath, dataUrl, fileName) => {
      const assetKey = `${projectPath}/assets/${fileName}`;
      // Store DataURL directly (it's a string)
      await saveAssetToDB(assetKey, dataUrl);
      return fileName;
    },

    // Navigation
    openEditor: (projectPath) => {
      console.log(`[Mock] Opening editor for ${projectPath}`);
      // Redirect to index.html with project path parameter
      window.location.href = `index.html?project=${encodeURIComponent(projectPath)}`;
    },

    openWelcome: () => {
      window.location.href = 'welcome.html';
    },

    // Events
    onLoadProject: (callback) => {
      // Check URL parameters for project path
      const params = new URLSearchParams(window.location.search);
      const projectPath = params.get('project');
      if (projectPath) {
        // Delay slightly to ensure app is ready
        setTimeout(() => callback(projectPath), 100);
      }
    },

    getCurrentProjectPath: async () => {
      const params = new URLSearchParams(window.location.search);
      return params.get('project');
    },
    
    checkFileExists: async (projectPath, fileName) => {
       const assetKey = `${projectPath}/assets/${fileName}`;
       const data = await getAssetFromDB(assetKey);
       return !!data;
    }
  };
})();
