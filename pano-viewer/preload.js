const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 项目管理
  getProjects: () => ipcRenderer.invoke('get-projects'),
  createProject: (name) => ipcRenderer.invoke('create-project', name),
  deleteProject: (path) => ipcRenderer.invoke('delete-project', path),
  
  // 文件操作
  saveProjectData: (path, data) => ipcRenderer.invoke('save-project-data', path, data),
  loadProjectData: (path) => ipcRenderer.invoke('load-project-data', path),
  saveAsset: (projectPath, fileData, fileName) => ipcRenderer.invoke('save-asset', projectPath, fileData, fileName),
  getAssetUrl: (projectPath, fileName) => ipcRenderer.invoke('get-asset-url', projectPath, fileName),
  saveDataUrlAsset: (projectPath, dataUrl, fileName) => ipcRenderer.invoke('save-dataurl-asset', projectPath, dataUrl, fileName),
  
  // 窗口导航
  openEditor: (projectPath) => ipcRenderer.send('open-editor', projectPath),
  openWelcome: () => ipcRenderer.send('open-welcome'),
  
  // 接收主进程消息
  onLoadProject: (callback) => ipcRenderer.on('load-project-in-editor', (_event, value) => callback(value)),
  getCurrentProjectPath: () => ipcRenderer.invoke('get-current-project-path')
});
