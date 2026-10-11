@echo off
title Healthcare Queue App - Public Web Tunnel Server
echo ===================================================================
echo     Healthcare OS - Public Web Host (Live on the Internet)
echo ===================================================================
echo.
cd /d "%~dp0"

echo [1/2] Ensuring latest builds are up to date...
call npm.cmd run build --workspace=@queueapp/web
call npm.cmd run build --workspace=@queueapp/api

echo.
echo [2/2] Launching Local Backend Server...
start "QueueApp Unified Server (Port 4000)" cmd /k "node apps/api/dist/src/main.js"

echo.
echo ===================================================================
echo   Creating Secure Public HTTPS Tunnel for your PC...
echo   Anyone in the world will be able to access your app!
echo ===================================================================
echo.
call npx.cmd --yes localtunnel --port 4000

pause
