#!/bin/bash

echo "========================================="
echo "  服务器部署脚本"
echo "========================================="
echo ""

# 配置变量
PROJECT_NAME="dirun_oioc"
PROJECT_DIR="/opt/$PROJECT_NAME"
GITHUB_REPO="https://github.com/你的用户名/dirun_oioc.git"  # 请修改为你的GitHub仓库地址
NODE_VERSION="16"

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then
    echo "⚠️  建议使用root用户执行此脚本"
    echo "   如果遇到权限问题，请使用: sudo bash deploy-server.sh"
fi

# 1. 安装Node.js
echo "📦 检查Node.js..."
if ! command -v node &> /dev/null; then
    echo "安装Node.js $NODE_VERSION..."
    curl -fsSL https://rpm.nodesource.com/setup_$NODE_VERSION.x | sudo bash -
    sudo yum install -y nodejs
else
    echo "✅ Node.js已安装: $(node -v)"
fi

# 2. 安装PM2
echo ""
echo "📦 检查PM2..."
if ! command -v pm2 &> /dev/null; then
    echo "安装PM2..."
    sudo npm install -g pm2
else
    echo "✅ PM2已安装"
fi

# 3. 安装Nginx（可选）
echo ""
echo "📦 检查Nginx..."
if ! command -v nginx &> /dev/null; then
    read -p "是否安装Nginx? (y/n): " install_nginx
    if [ "$install_nginx" = "y" ]; then
        echo "安装Nginx..."
        sudo yum install -y nginx
        sudo systemctl enable nginx
        echo "✅ Nginx安装完成"
    fi
else
    echo "✅ Nginx已安装"
fi

# 4. 克隆或更新代码
echo ""
echo "📥 获取项目代码..."
if [ -d "$PROJECT_DIR" ]; then
    echo "项目目录已存在，更新代码..."
    cd "$PROJECT_DIR"
    git pull
else
    echo "克隆项目代码..."
    sudo mkdir -p /opt
    cd /opt
    git clone "$GITHUB_REPO" "$PROJECT_NAME"
    cd "$PROJECT_DIR"
fi

# 5. 安装依赖
echo ""
echo "📦 安装后端依赖..."
npm install

# 6. 构建前端
echo ""
echo "🏗️  构建前端..."
cd admin
npm install
npm run build

# 复制构建产物到public目录
if [ -d "dist" ]; then
    echo "复制前端构建产物..."
    cp -r dist/* ../public/
else
    echo "⚠️  前端构建失败，请检查"
fi

cd ..

# 7. 配置环境变量
echo ""
echo "⚙️  配置环境变量..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ 已创建.env文件"
        echo ""
        echo "⚠️  请编辑.env文件，填入真实配置："
        echo "   vi $PROJECT_DIR/.env"
        echo ""
        echo "必需配置项："
        echo "  - YOUZAN_CLIENT_ID"
        echo "  - YOUZAN_CLIENT_SECRET"
        echo "  - YOUZAN_GRANT_ID"
        echo "  - OIOC_BASE_URL"
        echo "  - OIOC_USERNAME"
        echo "  - OIOC_PASSWORD"
        echo ""
        read -p "配置完成后按回车继续..."
    else
        echo "❌ 未找到.env.example文件"
        exit 1
    fi
else
    echo "✅ .env文件已存在"
fi

# 8. 配置防火墙
echo ""
echo "🔒 配置防火墙..."
if command -v firewall-cmd &> /dev/null; then
    sudo firewall-cmd --permanent --add-port=80/tcp
    sudo firewall-cmd --permanent --add-port=443/tcp
    sudo firewall-cmd --permanent --add-port=22/tcp
    sudo firewall-cmd --permanent --add-port=3000/tcp
    sudo firewall-cmd --reload
    echo "✅ 防火墙配置完成"
else
    echo "⚠️  未检测到firewalld，请手动配置防火墙"
fi

# 9. 启动服务
echo ""
echo "🚀 启动服务..."
pm2 delete dirun-oioc 2>/dev/null
pm2 start index.js --name dirun-oioc

# 设置开机自启
pm2 startup
pm2 save

echo ""
echo "✅ 服务启动成功！"
pm2 status

# 10. 配置Nginx（如果已安装）
if command -v nginx &> /dev/null; then
    echo ""
    read -p "是否配置Nginx反向代理? (y/n): " config_nginx
    if [ "$config_nginx" = "y" ]; then
        read -p "请输入域名或IP (默认: localhost): " domain
        domain=${domain:-localhost}
        
        cat > /tmp/dirun-oioc-nginx.conf <<EOF
server {
    listen 80;
    server_name $domain;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOF
        
        sudo mv /tmp/dirun-oioc-nginx.conf /etc/nginx/conf.d/dirun-oioc.conf
        sudo nginx -t && sudo systemctl restart nginx
        echo "✅ Nginx配置完成"
    fi
fi

# 11. 显示部署信息
echo ""
echo "========================================="
echo "  🎉 部署完成！"
echo "========================================="
echo ""
echo "项目目录: $PROJECT_DIR"
echo "日志目录: $PROJECT_DIR/logs"
echo ""
echo "服务管理命令："
echo "  查看状态: pm2 status"
echo "  查看日志: pm2 logs dirun-oioc"
echo "  重启服务: pm2 restart dirun-oioc"
echo "  停止服务: pm2 stop dirun-oioc"
echo ""
echo "访问地址："
echo "  本地: http://localhost:3000"
if command -v nginx &> /dev/null && [ -f "/etc/nginx/conf.d/dirun-oioc.conf" ]; then
    echo "  Nginx: http://$domain"
fi
echo ""
echo "健康检查: curl http://localhost:3000/health"
echo ""
