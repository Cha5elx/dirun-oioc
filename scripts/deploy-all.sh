#!/bin/bash

echo "========================================="
echo "  一键部署脚本 (本地执行)"
echo "========================================="
echo ""

# 配置变量
SERVER_USER="root"                    # 服务器用户名
SERVER_IP="your-server-ip"            # 服务器IP地址
SERVER_PROJECT_DIR="/opt/dirun_oioc"  # 服务器项目目录
LOCAL_PROJECT_DIR=$(pwd)              # 本地项目目录

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在项目根目录执行此脚本"
    exit 1
fi

# 步骤1: 推送代码到GitHub
echo "📤 步骤1: 推送代码到GitHub"
echo "-----------------------------------"
bash deploy-local.sh

if [ $? -ne 0 ]; then
    echo "❌ 推送失败，停止部署"
    exit 1
fi

echo ""
read -p "代码已推送到GitHub，按回车继续部署到服务器..."

# 步骤2: 部署到服务器
echo ""
echo "🖥️  步骤2: 部署到服务器"
echo "-----------------------------------"
echo "服务器: $SERVER_USER@$SERVER_IP"
echo ""

# 上传部署脚本到服务器
echo "上传部署脚本..."
scp deploy-server.sh "$SERVER_USER@$SERVER_IP:/tmp/"

# SSH到服务器执行部署
echo "执行服务器部署脚本..."
ssh "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
# 询问是否首次部署
read -p "是否首次部署? (y/n): " first_deploy

if [ "$first_deploy" = "y" ]; then
    echo "执行首次部署..."
    bash /tmp/deploy-server.sh
else
    echo "执行更新部署..."
    cd /opt/dirun_oioc
    git pull
    npm install
    cd admin && npm install && npm run build && cp -r dist/* ../public/ && cd ..
    pm2 restart dirun-oioc
fi
ENDSSH

echo ""
echo "========================================="
echo "  🎉 部署流程完成！"
echo "========================================="
echo ""
echo "访问地址: http://$SERVER_IP:3000"
echo "管理后台: http://$SERVER_IP:3000 (或通过Nginx访问)"
echo ""
