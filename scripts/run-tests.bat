@echo off
chcp 65001 >nul
echo ========================================
echo   运行全流程测试
echo ========================================
echo.

echo 检查服务是否运行...
curl -s http://localhost:3000/health >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 服务未运行，请先运行 start-local-test.bat
    pause
    exit /b 1
)
echo ✅ 服务正在运行

echo.
echo 开始测试...
echo ========================================
echo.

node tests\test-full-flow.js

echo.
echo ========================================
echo 测试完成！
echo ========================================
echo.
echo 查看管理后台: http://localhost:3000
echo 默认账号: admin / admin123
echo.
pause
