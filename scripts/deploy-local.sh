#!/bin/bash

echo "========================================="
echo "  本地代码推送到GitHub"
echo "========================================="
echo ""
echo "工作流: 本地构建前端 → 推送到 GitHub → 服务器 git pull 直接用"
echo ""

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在项目根目录执行此脚本"
    exit 1
fi

# 检查前端源码是否有变更，提示构建
ADMIN_SRC="admin/src/"
if [ -d "$ADMIN_SRC" ]; then
    # 检查是否有未提交的前端源码变更
    ADMIN_CHANGES=$(git status --porcelain "$ADMIN_SRC" 2>/dev/null)
    PUBLIC_CHANGES=$(git status --porcelain public/ 2>/dev/null)

    if [ -n "$ADMIN_CHANGES" ] || [ -n "$PUBLIC_CHANGES" ]; then
        echo "⚠️  检测到前端相关变更（admin/src/ 或 public/）"
        echo ""
        read -p "是否重新构建前端？(y/n，默认 y): " rebuild_frontend
        rebuild_frontend=${rebuild_frontend:-y}

        if [ "$rebuild_frontend" = "y" ]; then
            echo "🏗️  构建前端..."
            cd admin
            npm run build
            BUILD_RESULT=$?
            cd ..

            if [ $BUILD_RESULT -ne 0 ]; then
                echo "❌ 前端构建失败，请检查错误后重试"
                exit 1
            fi
            echo "✅ 前端构建完成（public/ 目录已更新）"
        else
            echo "⚠️  跳过前端构建，使用当前 public/ 目录内容"
            echo "   如需更新前端，请先执行: cd admin && npm run build"
        fi
    fi
fi

# 检查是否有未提交的更改
if [ -z "$(git status --porcelain)" ]; then
    echo "✅ 没有需要提交的更改，直接推送..."
else
    echo ""
    echo "📝 以下文件将被提交："
    echo "---"
    git status --short
    echo "---"
    echo ""
    read -p "请输入提交信息 (默认: Update): " commit_msg
    commit_msg=${commit_msg:-"Update"}

    git add .
    git commit -m "$commit_msg"
fi

# 检查远程仓库
if [ -z "$(git remote get-url origin 2>/dev/null)" ]; then
    echo ""
    echo "⚠️  未配置远程仓库"
    read -p "请输入GitHub仓库地址 (例如: https://github.com/username/dirun_oioc.git): " repo_url
    git remote add origin "$repo_url"
fi

# 推送到GitHub
echo ""
echo "🚀 推送代码到GitHub..."
current_branch=$(git branch --show-current)
if [ -z "$current_branch" ]; then
    git branch -M main
    current_branch="main"
fi

git push -u origin "$current_branch"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 代码推送成功！"
    echo ""
    echo "服务器端更新："
    echo "  ssh 到服务器后执行:"
    echo "  cd /opt/dirun_oioc && git pull && npm install && pm2 reload dirun-oioc"
else
    echo ""
    echo "❌ 推送失败，请检查网络连接和仓库权限"
    exit 1
fi
