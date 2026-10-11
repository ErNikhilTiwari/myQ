@echo off
title Healthcare Queue App - Unified Local Host
echo ===================================================================
echo     Healthcare OS - Queue Management System Local Host Server
echo ===================================================================
echo.
cd /d "%~dp0"

echo [1/2] Ensuring latest builds are up to date...
call npm.cmd run build --workspace=@queueapp/web
call npm.cmd run build --workspace=@queueapp/api

echo.
echo [2/2] Launching Local Backend Server on port 4000...
start "QueueApp Unified Server (Port 4000)" cmd /k "node apps/api/dist/src/main.js"

echo.
echo ===================================================================
echo   Local Server started successfully on port 4000!
echo.
echo   - Local Access (This PC):         http://localhost:4000
echo   - Smart TV / Mobile on Wi-Fi:     http://192.168.1.48:4000
echo ===================================================================
echo.
echo Opening browser in 3 seconds...
timeout /t 3 /nobreak >nul
start http://localhost:4000

pause
