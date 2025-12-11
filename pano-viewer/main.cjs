const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { pathToFileURL } = require('url');

let mainWindow;
let currentOpenProject = null;

// 存储项目的根目录 (Documents/PanoEditorProjects)
const PROJECTS_DIR = path.join(app.getPath('documents'), 'PanoEditorProjects');

// 确保目录存在
if (!fs.existsSync(PROJECTS_DIR)) {
  fs.mkdirSync(PROJECTS_DIR, { recursive: true });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: '全景编辑器',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false // 允许加载本地资源
    }
  });

  // 默认加载欢迎页
  mainWindow.loadFile('welcome.html');
  
  Menu.setApplicationMenu(null);
  
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// --- IPC Handlers ---

// 获取所有项目
ipcMain.handle('get-projects', async () => {
  try {
    const projects = [];
    const items = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true });
    
    for (const item of items) {
      if (item.isDirectory()) {
        const projectPath = path.join(PROJECTS_DIR, item.name);
        const configPath = path.join(projectPath, 'project.json');
        
        if (fs.existsSync(configPath)) {
          try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            projects.push({
              name: item.name,
              path: projectPath,
              lastModified: config.lastModified || Date.now(),
              thumbnail: config.thumbnail || null
            });
          } catch (e) {
            console.error('Error reading project config:', e);
          }
        }
      }
    }
    // 按修改时间倒序
    return projects.sort((a, b) => b.lastModified - a.lastModified);
  } catch (error) {
    console.error('Failed to get projects:', error);
    return [];
  }
});

// 创建新项目
ipcMain.handle('create-project', async (event, name) => {
  try {
    const projectPath = path.join(PROJECTS_DIR, name);
    if (fs.existsSync(projectPath)) {
      throw new Error('项目已存在');
    }
    
    fs.mkdirSync(projectPath);
    fs.mkdirSync(path.join(projectPath, 'assets'));
    
    const initialConfig = {
      name: name,
      created: Date.now(),
      lastModified: Date.now(),
      scenes: []
    };
    
    fs.writeFileSync(path.join(projectPath, 'project.json'), JSON.stringify(initialConfig, null, 2));
    
    return { success: true, path: projectPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 删除项目
ipcMain.handle('delete-project', async (event, projectPath) => {
  try {
    fs.rmSync(projectPath, { recursive: true, force: true });
    return true;
  } catch (error) {
    console.error('Failed to delete project:', error);
    return false;
  }
});

// 保存项目数据 (project.json)
ipcMain.handle('save-project-data', async (event, projectPath, data) => {
  try {
    const configPath = path.join(projectPath, 'project.json');
    const existing = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath)) : {};
    const merged = { ...existing, ...data, lastModified: Date.now() };
    
    fs.writeFileSync(configPath, JSON.stringify(merged, null, 2));
    return true;
  } catch (error) {
    console.error('Failed to save project data:', error);
    return false;
  }
});

// 加载项目数据
ipcMain.handle('load-project-data', async (event, projectPath) => {
  try {
    const configPath = path.join(projectPath, 'project.json');
    if (!fs.existsSync(configPath)) return null;
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (error) {
    console.error('Failed to load project data:', error);
    return null;
  }
});

// 保存资源文件 (图片)
ipcMain.handle('save-asset', async (event, projectPath, buffer, fileName) => {
  try {
    const assetsDir = path.join(projectPath, 'assets');
    if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir);
    
    const filePath = path.join(assetsDir, fileName);
    fs.writeFileSync(filePath, Buffer.from(buffer));
    
    // 返回文件名，由前端决定如何拼接路径
    return fileName;
  } catch (error) {
    console.error('Failed to save asset:', error);
    throw error;
  }
});

// 获取资源的完整 URL
ipcMain.handle('get-asset-url', async (event, projectPath, fileName) => {
  try {
    // 兼容处理：如果 fileName 已经是绝对路径或 URL，直接返回
    if (fileName.startsWith('file:')) {
      return fileName;
    }
    
    if (fileName.includes(':\\') || fileName.startsWith('/')) {
      // 如果是 Windows 绝对路径，转 URL
      if (fileName.includes(':\\')) {
        return pathToFileURL(fileName).href;
      }
      return fileName;
    }
    
    // 相对路径：拼接 projectPath/assets/fileName
    const assetsDir = path.join(projectPath, 'assets');
    const filePath = path.join(assetsDir, fileName);
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠ 资源文件不存在: ${filePath}`);
      return '';
    }
    
    const fileUrl = pathToFileURL(filePath).href;
    console.log(`🔗 资源 URL: ${fileName} -> ${fileUrl}`);
    return fileUrl;
  } catch (error) {
    console.error('Failed to get asset url:', error);
    return '';
  }
});

// 保存 DataURL 资源文件 (例如 EXR 渲染后的 JPEG)
ipcMain.handle('save-dataurl-asset', async (event, projectPath, dataUrl, fileName) => {
  try {
    const assetsDir = path.join(projectPath, 'assets');
    if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir);
    const filePath = path.join(assetsDir, fileName);
    const m = String(dataUrl).match(/^data:(.+);base64,(.+)$/);
    if (!m) throw new Error('Invalid dataURL');
    const buf = Buffer.from(m[2], 'base64');
    fs.writeFileSync(filePath, buf);
    return fileName;
  } catch (error) {
    console.error('Failed to save dataurl asset:', error);
    throw error;
  }
});

// 打开编辑器并加载项目
ipcMain.on('open-editor', (event, projectPath) => {
  currentOpenProject = projectPath;
  mainWindow.loadFile('index.html').then(() => {
    // 页面加载完成后，发送项目路径给渲染进程
    mainWindow.webContents.send('load-project-in-editor', projectPath);
  });
});

// 返回欢迎页
ipcMain.on('open-welcome', () => {
  currentOpenProject = null;
  mainWindow.loadFile('welcome.html');
});

// 获取当前打开的项目路径 (用于页面刷新后恢复状态)
ipcMain.handle('get-current-project-path', () => {
  return currentOpenProject;
});
