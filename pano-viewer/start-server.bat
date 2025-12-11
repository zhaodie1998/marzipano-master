@echo off
echo ========================================
echo   全景编辑器 - 服务端启动
echo ========================================
echo.

cd /d "%~dp0server"

if not exist "node_modules" (
    echo 正在安装依赖...
    call npm install
    echo.
)

echo 启动服务器...
echo 访问地址: http://localhost:3000/welcome-web.html
echo.
echo 按 Ctrl+C 停止服务器
echo.

node server.js
pause
