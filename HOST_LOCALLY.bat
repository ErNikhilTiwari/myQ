@echo off
title Healthcare Queue App - Unified Local Host
echo ===================================================================
echo     Healthcare OS - Queue Management System Local Host Server
echo ===================================================================
echo.
cd /d "%~dp0"

echo [1/3] Building Web Frontend...
call npm.cmd run build --workspace=@queueapp/web

echo.
echo [2/3] Building Backend API...
call npm.cmd run build --workspace=@queueapp/api

echo.
echo [3/3] Starting Unified Server on port 4000...
echo Opening browser in 3 seconds...
start http://localhost:4000

node apps/api/dist/src/main.js
pause
