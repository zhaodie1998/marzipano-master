#!/bin/bash

echo "========================================"
echo "  全景编辑器 - 服务端启动"
echo "========================================"
echo

cd "$(dirname "$0")/server"

if [ ! -d "node_modules" ]; then
    echo "正在安装依赖..."
    npm install
    echo
fi

echo "启动服务器..."
echo "访问地址: http://localhost:3000/welcome-web.html"
echo
echo "按 Ctrl+C 停止服务器"
echo

node server.js
