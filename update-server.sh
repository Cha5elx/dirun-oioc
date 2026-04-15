#!/bin/bash

echo "========================================="
echo "  项目更新脚本"
echo "========================================="
echo ""

PROJECT_DIR="/opt/dirun_oioc"

# 检查项目目录
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ 项目目录不存在: $PROJECT_DIR"
    echo "   请先执行部署脚本: bash deploy-server.sh"
    exit 1
fi

cd "$PROJECT_DIR"

# 1. 备份当前版本
echo "📦 备份当前版本..."
BACKUP_DIR="/opt/backups/dirun_oioc_$(date +%Y%m%d_%H%M%S)"
sudo mkdir -p "$BACKUP_DIR"
sudo cp -r "$PROJECT_DIR" "$BACKUP_DIR/"
echo "✅ 备份完成: $BACKUP_DIR"

# 2. 拉取最新代码
echo ""
echo "📥 拉取最新代码..."
git fetch origin
git status

read -p "是否继续更新? (y/n): " continue_update
if [ "$continue_update" != "y" ]; then
    echo "取消更新"
    exit 0
fi

git pull

# 3. 更新后端依赖
echo ""
echo "📦 更新后端依赖..."
npm install

# 4. 更新前端
echo ""
read -p "是否重新构建前端? (y/n): " rebuild_frontend
if [ "$rebuild_frontend" = "y" ]; then
    echo "🏗️  构建前端..."
    cd admin
    npm install
    npm run build
    cp -r dist/* ../public/
    cd ..
    echo "✅ 前端构建完成"
fi

# 5. 检查环境变量
echo ""
if [ ! -f ".env" ]; then
    echo "⚠️  .env文件不存在，请配置环境变量"
    read -p "是否从.env.example创建? (y/n): " create_env
    if [ "$create_env" = "y" ]; then
        cp .env.example .env
        echo "✅ 已创建.env文件，请编辑配置"
        vi .env
    fi
fi

# 6. 重启服务
echo ""
echo "🔄 重启服务..."
pm2 restart dirun-oioc

# 7. 显示状态
echo ""
echo "✅ 更新完成！"
echo ""
pm2 status dirun-oioc
echo ""
echo "查看日志: pm2 logs dirun-oioc"
echo "回滚命令: sudo cp -r $BACKUP_DIR/dirun_oioc/* $PROJECT_DIR/ && pm2 restart dirun-oioc"
echo ""
