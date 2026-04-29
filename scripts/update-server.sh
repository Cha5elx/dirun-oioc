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

# 7. 确认前端资源（从 Git 拉取，已预构建）
echo ""
echo "🖼️  前端资源..."
if [ -d "public" ] && [ -n "$(ls -A public/ 2>/dev/null)" ]; then
    echo "✅ public/ 目录已包含预构建的前端资源"
    echo "   前端在本地构建后推送到 Git，服务器 git pull 直接使用"
else
    echo "⚠️  public/ 目录为空！请确保在本地构建前端并推送到 Git"
    echo "   本地构建命令: cd admin && npm run build"
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

# 9. 重启服务（优先使用 reload 实现零停机）
echo ""
echo "🔄 重启服务..."

# 确保使用正确的Node.js版本
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use $NODE_VERSION 2>/dev/null || nvm use default

# 检测 PM2 实例数，>=2 时使用 reload 实现零停机
INSTANCE_COUNT=$(pm2 show dirun-oioc 2>/dev/null | grep -oP 'instances.*?\K\d+' | head -1)
if [ -z "$INSTANCE_COUNT" ]; then
    INSTANCE_COUNT=1
fi

if [ "$INSTANCE_COUNT" -ge 2 ]; then
    echo "检测到 $INSTANCE_COUNT 个实例，使用 reload 实现零停机更新..."
    pm2 reload dirun-oioc
else
    echo "单实例模式，使用 restart（有 2~5 秒停机）..."
    echo "💡 建议升级为集群模式: pm2 scale dirun-oioc 2"
    pm2 restart dirun-oioc
fi

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
echo "回滚命令: sudo cp -r $BACKUP_DIR/dirun_oioc/* $PROJECT_DIR/ && pm2 reload dirun-oioc"
echo ""
