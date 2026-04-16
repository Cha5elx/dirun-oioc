@echo off
chcp 65001 >nul
echo ========================================
echo   本地测试启动脚本
echo ========================================
echo.

echo [1/5] 检查环境...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 未安装Node.js，请先安装
    pause
    exit /b 1
)
echo ✅ Node.js已安装

echo.
echo [2/5] 安装依赖...
if not exist "node_modules" (
    echo 首次运行，安装依赖...
    call npm install
) else (
    echo 依赖已安装
)

echo.
echo [3/5] 配置环境变量...
if not exist ".env" (
    if exist ".env.development" (
        copy .env.development .env >nul
        echo ✅ 已创建.env文件（使用开发环境配置）
    ) else (
        echo ⚠️  未找到.env.development，请手动配置.env
    )
) else (
    echo ✅ .env文件已存在
)

echo.
echo [4/5] 生成模拟数据...
node tests\mock-data.js

echo.
echo [5/5] 构建前端...
cd admin
if not exist "node_modules" (
    echo 首次运行，安装前端依赖...
    call npm install
)
echo 构建前端...
call npm run build
if not exist "..\public\index.html" (
    echo 复制前端构建产物...
    xcopy /E /I /Y dist\* ..\public\ >nul
)
cd ..

echo.
echo ========================================
echo   启动服务
echo ========================================
echo.
echo 服务地址:
echo   - 主页: http://localhost:3000
echo   - 管理后台: http://localhost:3000
echo   - 健康检查: http://localhost:3000/health
echo.
echo 默认账号:
echo   - 用户名: admin
echo   - 密码: admin123
echo.
echo 按 Ctrl+C 停止服务
echo ========================================
echo.

start "" "http://localhost:3000"

node index.js
