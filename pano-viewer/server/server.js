/**
 * 全景编辑器 - 服务端
 * 处理图片上传、项目管理等功能
 */

import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';

// 数据存储目录
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
const PROJECTS_DIR = path.join(DATA_DIR, 'projects');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

// 确保目录存在
[DATA_DIR, PROJECTS_DIR, UPLOADS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 简易鉴权：若设置了 AUTH_TOKEN，则验证非GET/静态的请求头 x-auth-token
app.use((req, res, next) => {
  if (!AUTH_TOKEN) return next();
  const isWrite = ['POST','PUT','DELETE'].includes(req.method);
  const isApi = req.path.startsWith('/api/');
  if (isWrite && isApi) {
    const token = req.header('x-auth-token') || '';
    if (token !== AUTH_TOKEN) return res.status(401).json({ error: '未授权' });
  }
  next();
});

// 静态文件服务
app.use(express.static(path.join(__dirname, '..')));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/projects', express.static(PROJECTS_DIR));

// Multer 配置 - 图片上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const projectId = req.params.projectId || req.body.projectId;
    if (projectId) {
      const projectDir = path.join(PROJECTS_DIR, projectId, 'assets');
      if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir, { recursive: true });
      }
      cb(null, projectDir);
    } else {
      cb(null, UPLOADS_DIR);
    }
  },
  filename: (req, file, cb) => {
    // 保留原始文件名，添加时间戳避免冲突
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    const safeName = name.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5-]/g, '_');
    const timestamp = Date.now();
    cb(null, `${safeName}_${timestamp}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|exr|hdr/i;
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    const mimetype = file.mimetype;
    
    if (allowedTypes.test(ext) || mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'));
    }
  }
});

// ============ API 路由 ============

// 获取所有项目
app.get('/api/projects', (req, res) => {
  try {
    const projects = [];
    
    if (!fs.existsSync(PROJECTS_DIR)) {
      return res.json([]);
    }
    
    const items = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true });
    
    for (const item of items) {
      if (item.isDirectory()) {
        const projectPath = path.join(PROJECTS_DIR, item.name);
        const configPath = path.join(projectPath, 'project.json');
        
        if (fs.existsSync(configPath)) {
          try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            projects.push({
              id: item.name,
              name: config.name || item.name,
              path: `/projects/${item.name}`,
              lastModified: config.lastModified || fs.statSync(configPath).mtimeMs,
              thumbnail: config.thumbnail || null,
              sceneCount: config.scenes?.length || 0
            });
          } catch (e) {
            console.error('读取项目配置失败:', e);
          }
        }
      }
    }
    
    // 按修改时间倒序
    projects.sort((a, b) => b.lastModified - a.lastModified);
    res.json(projects);
  } catch (error) {
    console.error('获取项目列表失败:', error);
    res.status(500).json({ error: '获取项目列表失败' });
  }
});

// 创建新项目
app.post('/api/projects', (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: '项目名称不能为空' });
    }
    
    // 生成唯一ID
    const projectId = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const projectPath = path.join(PROJECTS_DIR, projectId);
    
    fs.mkdirSync(projectPath);
    fs.mkdirSync(path.join(projectPath, 'assets'));
    
    const config = {
      id: projectId,
      name: name.trim(),
      created: Date.now(),
      lastModified: Date.now(),
      scenes: [],
      version: '1.0'
    };
    
    fs.writeFileSync(
      path.join(projectPath, 'project.json'),
      JSON.stringify(config, null, 2)
    );
    
    res.json({
      success: true,
      project: {
        id: projectId,
        name: config.name,
        path: `/projects/${projectId}`
      }
    });
  } catch (error) {
    console.error('创建项目失败:', error);
    res.status(500).json({ error: '创建项目失败' });
  }
});

// 获取项目详情
app.get('/api/projects/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    const configPath = path.join(PROJECTS_DIR, projectId, 'project.json');
    
    if (!fs.existsSync(configPath)) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    res.json(config);
  } catch (error) {
    console.error('获取项目详情失败:', error);
    res.status(500).json({ error: '获取项目详情失败' });
  }
});

// 更新项目数据
app.put('/api/projects/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    const configPath = path.join(PROJECTS_DIR, projectId, 'project.json');
    
    if (!fs.existsSync(configPath)) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    const existing = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const updated = {
      ...existing,
      ...req.body,
      id: projectId, // 保持ID不变
      lastModified: Date.now()
    };
    
    fs.writeFileSync(configPath, JSON.stringify(updated, null, 2));
    res.json({ success: true, project: updated });
  } catch (error) {
    console.error('更新项目失败:', error);
    res.status(500).json({ error: '更新项目失败' });
  }
});

// 删除项目
app.delete('/api/projects/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    const projectPath = path.join(PROJECTS_DIR, projectId);
    
    if (!fs.existsSync(projectPath)) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    fs.rmSync(projectPath, { recursive: true, force: true });
    res.json({ success: true });
  } catch (error) {
    console.error('删除项目失败:', error);
    res.status(500).json({ error: '删除项目失败' });
  }
});

// 上传图片到项目
app.post('/api/projects/:projectId/upload', upload.array('images', 50), (req, res) => {
  try {
    const { projectId } = req.params;
    const files = req.files;
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: '没有上传文件' });
    }
    
    const results = files.map(file => ({
      originalName: file.originalname,
      fileName: file.filename,
      url: `/projects/${projectId}/assets/${file.filename}`,
      size: file.size
    }));
    
    res.json({ success: true, files: results });
  } catch (error) {
    console.error('上传失败:', error);
    res.status(500).json({ error: '上传失败' });
  }
});

// 上传 Base64 图片
app.post('/api/projects/:projectId/upload-base64', (req, res) => {
  try {
    const { projectId } = req.params;
    const { dataUrl, fileName } = req.body;
    
    if (!dataUrl || !fileName) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    const projectDir = path.join(PROJECTS_DIR, projectId, 'assets');
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }
    
    // 解析 base64
    const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: '无效的 dataUrl 格式' });
    }
    
    const buffer = Buffer.from(matches[2], 'base64');
    const ext = path.extname(fileName);
    const name = path.basename(fileName, ext);
    const safeName = name.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5-]/g, '_');
    const finalName = `${safeName}_${Date.now()}${ext}`;
    const filePath = path.join(projectDir, finalName);
    
    fs.writeFileSync(filePath, buffer);
    
    res.json({
      success: true,
      file: {
        fileName: finalName,
        url: `/projects/${projectId}/assets/${finalName}`,
        size: buffer.length
      }
    });
  } catch (error) {
    console.error('上传 Base64 失败:', error);
    res.status(500).json({ error: '上传失败' });
  }
});

// 删除项目中的图片
app.delete('/api/projects/:projectId/assets/:fileName', (req, res) => {
  try {
    const { projectId, fileName } = req.params;
    const filePath = path.join(PROJECTS_DIR, projectId, 'assets', fileName);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (error) {
    console.error('删除文件失败:', error);
    res.status(500).json({ error: '删除文件失败' });
  }
});

// 获取项目资源列表
app.get('/api/projects/:projectId/assets', (req, res) => {
  try {
    const { projectId } = req.params;
    const assetsDir = path.join(PROJECTS_DIR, projectId, 'assets');
    
    if (!fs.existsSync(assetsDir)) {
      return res.json([]);
    }
    
    const files = fs.readdirSync(assetsDir).map(fileName => {
      const filePath = path.join(assetsDir, fileName);
      const stats = fs.statSync(filePath);
      return {
        fileName,
        url: `/projects/${projectId}/assets/${fileName}`,
        size: stats.size,
        modified: stats.mtimeMs
      };
    });
    
    res.json(files);
  } catch (error) {
    console.error('获取资源列表失败:', error);
    res.status(500).json({ error: '获取资源列表失败' });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '文件大小超过限制 (最大 100MB)' });
    }
    return res.status(400).json({ error: err.message });
  }
  
  res.status(500).json({ error: err.message || '服务器内部错误' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 全景编辑器服务已启动: http://localhost:${PORT}`);
  console.log(`📁 数据目录: ${DATA_DIR}`);
});

export default app;
// 返回鉴权信息
app.get('/api/auth-info', (req, res) => {
  res.json({ requireToken: !!AUTH_TOKEN });
});
