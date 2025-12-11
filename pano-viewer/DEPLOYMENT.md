# 部署指南

## 📦 生产环境部署

### 1. 环境准备

#### 1.1 配置环境变量
```bash
# 复制环境变量示例文件
cp .env.example .env

# 编辑 .env 文件，配置生产环境参数
NODE_ENV=production
APP_URL=https://your-domain.com
```

#### 1.2 依赖检查
- ✅ 确保服务器支持 HTTPS（Service Worker 需要）
- ✅ 确保服务器支持 CORS（CDN资源访问）
- ✅ 推荐使用 Nginx 或 Apache 作为 Web 服务器

---

### 2. 性能优化清单

#### 2.1 已实现的优化
- ✅ **资源预加载**：关键CSS/JS文件预加载
- ✅ **DNS预解析**：CDN域名预解析
- ✅ **Service Worker**：离线缓存和快速加载
- ✅ **CDN加速**：Three.js使用jsdelivr CDN
- ✅ **按钮优化**：简化UI，减少DOM元素
- ✅ **星空背景**：矢量SVG，体积小

#### 2.2 建议优化（可选）
- 🔄 **启用Gzip/Brotli压缩**（服务器端）
- 🔄 **配置HTTP/2**（服务器端）
- 🔄 **图片懒加载**（大量场景时）
- 🔄 **CSS/JS压缩**（生产构建）

---

### 3. Nginx 配置示例

#### 3.1 基础配置
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL 证书
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # 根目录
    root /var/www/marzipano-master;
    index pano-viewer/index-pro.html;
    
    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/javascript application/javascript application/json image/svg+xml;
    
    # 缓存策略
    location ~* \.(jpg|jpeg|png|gif|svg|webp)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location ~* \.(css|js)$ {
        expires 1w;
        add_header Cache-Control "public";
    }
    
    # Service Worker 不缓存
    location /pano-viewer/service-worker.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        expires 0;
    }
    
    # HTML 不缓存
    location ~* \.html$ {
        add_header Cache-Control "no-cache";
        expires 0;
    }
    
    # CORS 配置（如需要）
    add_header Access-Control-Allow-Origin *;
    add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
}
```

#### 3.2 HTTP 重定向到 HTTPS
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

---

### 4. Apache 配置示例

#### 4.1 .htaccess 配置
```apache
# 启用 Gzip 压缩
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/css text/javascript application/javascript application/json image/svg+xml
</IfModule>

# 缓存策略
<IfModule mod_expires.c>
    ExpiresActive On
    
    # 图片缓存 1 年
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
    
    # CSS/JS 缓存 1 周
    ExpiresByType text/css "access plus 1 week"
    ExpiresByType application/javascript "access plus 1 week"
    
    # HTML 不缓存
    ExpiresByType text/html "access plus 0 seconds"
</IfModule>

# Service Worker 不缓存
<Files "service-worker.js">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
    Header set Expires "0"
</Files>

# HTTPS 重定向
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</IfModule>
```

---

### 5. Docker 部署（可选）

#### 5.1 Dockerfile
```dockerfile
FROM nginx:alpine

# 复制文件
COPY . /usr/share/nginx/html

# 复制 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
```

#### 5.2 构建和运行
```bash
# 构建镜像
docker build -t marzipano-pro .

# 运行容器
docker run -d -p 80:80 -p 443:443 --name marzipano-app marzipano-pro
```

---

### 6. 性能监控

#### 6.1 关键指标
- **FCP (First Contentful Paint)**: < 1.8s
- **LCP (Largest Contentful Paint)**: < 2.5s
- **TTI (Time to Interactive)**: < 3.8s
- **CLS (Cumulative Layout Shift)**: < 0.1

#### 6.2 监控工具
- Google Lighthouse
- WebPageTest
- GTmetrix

#### 6.3 优化建议
```bash
# 使用 Lighthouse 检测
lighthouse https://your-domain.com --view

# 检查 Service Worker 状态
chrome://serviceworker-internals/
```

---

### 7. 安全配置

#### 7.1 推荐的安全头
```nginx
# Nginx 示例
add_header X-Frame-Options "SAMEORIGIN";
add_header X-Content-Type-Options "nosniff";
add_header X-XSS-Protection "1; mode=block";
add_header Referrer-Policy "strict-origin-when-cross-origin";
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self';";
```

---

### 8. 故障排查

#### 8.1 常见问题

**问题：Service Worker 不工作**
```bash
# 解决方案
1. 确保使用 HTTPS
2. 检查路径是否正确：/pano-viewer/service-worker.js
3. 清除浏览器缓存
4. 检查控制台错误
```

**问题：资源加载失败**
```bash
# 解决方案
1. 检查 CORS 配置
2. 确认 CDN 可访问
3. 检查网络连接
4. 查看 Service Worker 缓存状态
```

**问题：页面加载慢**
```bash
# 解决方案
1. 启用 Gzip/Brotli 压缩
2. 配置 CDN 加速
3. 优化图片大小
4. 使用浏览器缓存
```

---

### 9. 版本更新流程

#### 9.1 更新步骤
```bash
1. 修改 service-worker.js 中的版本号
   CACHE_NAME = 'marzipano-pro-v1.0.1'

2. 更新 HTML 中的资源版本号
   app-pro.js?v=2.7

3. 部署新版本到服务器

4. 用户刷新页面即可自动更新
```

#### 9.2 强制更新
```javascript
// 在控制台执行
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => registration.unregister());
});
location.reload(true);
```

---

### 10. 备份策略

#### 10.1 需要备份的内容
- ✅ 用户上传的全景图
- ✅ 项目配置文件 (localStorage)
- ✅ 自定义设置

#### 10.2 备份脚本示例
```bash
#!/bin/bash
BACKUP_DIR="/backup/marzipano"
DATE=$(date +%Y%m%d_%H%M%S)

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份文件
tar -czf $BACKUP_DIR/marzipano_$DATE.tar.gz /var/www/marzipano-master

# 保留最近 7 天的备份
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

---

## 📞 技术支持

如遇到部署问题，请检查：
1. 浏览器控制台错误信息
2. Service Worker 状态
3. 网络请求情况
4. 服务器日志

---

**部署完成后，建议进行全面测试：**
- ✅ 上传功能
- ✅ EXR/HDR 支持
- ✅ 热点编辑
- ✅ 场景切换
- ✅ 离线访问
- ✅ 性能指标
