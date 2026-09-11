@echo off
chcp 65001 >nul
title 好命小猪
cd /d "%~dp0"
echo.
echo   正在启动 好命小猪，请稍等...
echo.
call npm run start
echo.
echo   服务已停止，按任意键关闭窗口。
pause >nul
