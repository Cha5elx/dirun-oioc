#!/bin/bash

echo "========================================="
echo "  项目更新脚本"
echo "========================================="
echo ""

PROJECT_DIR="/opt/dirun_oioc"
NODE_VERSION="18"

# 加载nvm环境
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# 检查项目目录
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ 项目目录不存在: $PROJECT_DIR"
    echo "   请先执行部署脚本: bash deploy-server.sh"
    exit 1
fi

cd "$PROJECT_DIR"

# 1. 备份SQLite数据库
echo "📦 备份SQLite数据库..."
if [ -f "database/dirun.db" ]; then
    mkdir -p database/backups
    BACKUP_FILE="database/dirun.db.backup.$(date +%Y%m%d_%H%M%S)"
    cp database/dirun.db "$BACKUP_FILE"
    echo "✅ 数据库备份完成: $BACKUP_FILE"
else
    echo "⚠️  数据库文件不存在，跳过备份"
fi

# 2. 备份当前版本
echo ""
echo "📦 备份当前版本..."
BACKUP_DIR="/opt/backups/dirun_oioc_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r "$PROJECT_DIR" "$BACKUP_DIR/"
echo "✅ 备份完成: $BACKUP_DIR"

# 3. 检查package.json是否有变化
echo ""
echo "📋 检查依赖变化..."
OLD_PACKAGE_MD5=$(md5sum package.json 2>/dev/null | cut -d' ' -f1)

# 4. 拉取最新代码
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

# 5. 检查是否需要重新编译原生模块
NEW_PACKAGE_MD5=$(md5sum package.json 2>/dev/null | cut -d' ' -f1)
NEED_REBUILD=false

if [ "$OLD_PACKAGE_MD5" != "$NEW_PACKAGE_MD5" ]; then
    echo "⚠️  package.json 有变化，需要重新编译原生模块"
    NEED_REBUILD=true
fi

# 6. 更新后端依赖
echo ""
echo "📦 更新后端依赖..."

# 确保使用正确的Node.js版本
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use $NODE_VERSION 2>/dev/null || nvm use default

if [ "$NEED_REBUILD" = true ]; then
    echo "重新安装依赖并编译原生模块..."
    rm -rf node_modules
    npm install
else
    npm install
fi

# 7. 更新前端
echo ""
read -p "是否重新构建前端? (y/n): " rebuild_frontend
if [ "$rebuild_frontend" = "y" ]; then
    echo "🏗️  构建前端..."
    cd admin
    npm install
    npm run build
    cd ..
    echo "✅ 前端构建完成（Vite 直接输出到 public/ 目录）"
fi

# 8. 检查环境变量
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

# 9. 重启服务
echo ""
echo "🔄 重启服务..."

# 确保使用正确的Node.js版本
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use $NODE_VERSION 2>/dev/null || nvm use default

pm2 restart dirun-oioc

# 10. 健康检查
echo ""
echo "🏥 健康检查..."
sleep 5
HEALTH_CHECK_PASSED=false

for i in {1..3}; do
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        HEALTH_CHECK_PASSED=true
        break
    fi
    echo "第 $i 次健康检查失败，等待重试..."
    sleep 3
done

if [ "$HEALTH_CHECK_PASSED" = true ]; then
    echo "✅ 服务健康检查通过"
else
    echo "❌ 服务健康检查失败！"
    echo ""
    echo "请检查日志: pm2 logs dirun-oioc"
    echo ""
    echo "如需回滚，执行:"
    echo "  sudo cp -r $BACKUP_DIR/dirun_oioc/* $PROJECT_DIR/"
    echo "  pm2 restart dirun-oioc"
    exit 1
fi

# 11. 显示状态
echo ""
echo "✅ 更新完成！"
echo ""
pm2 status dirun-oioc
echo ""
echo "Node.js: $(node -v)"
echo ""
echo "查看日志: pm2 logs dirun-oioc"
echo "回滚命令: sudo cp -r $BACKUP_DIR/dirun_oioc/* $PROJECT_DIR/ && pm2 restart dirun-oioc"
echo ""
