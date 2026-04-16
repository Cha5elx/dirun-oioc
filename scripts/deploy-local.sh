#!/bin/bash

echo "========================================="
echo "  本地代码推送到GitHub"
echo "========================================="

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在项目根目录执行此脚本"
    exit 1
fi

# 检查git是否已初始化
if [ ! -d ".git" ]; then
    echo "📦 初始化Git仓库..."
    git init
fi

# 检查是否有未提交的更改
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 提交代码更改..."
    git add .
    read -p "请输入提交信息 (默认: Update): " commit_msg
    commit_msg=${commit_msg:-"Update"}
    git commit -m "$commit_msg"
else
    echo "✅ 没有需要提交的更改"
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
    echo "下一步："
    echo "1. SSH登录到服务器"
    echo "2. 执行服务器部署脚本: bash deploy-server.sh"
else
    echo ""
    echo "❌ 推送失败，请检查网络连接和仓库权限"
fi
