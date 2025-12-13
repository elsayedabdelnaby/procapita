@echo off
title WhatsApp Service
echo ========================================
echo   WhatsApp Service Starting...
echo ========================================
echo.

cd /d %~dp0

if not exist node_modules (
    echo Installing dependencies...
    call npm install
    echo.
)

echo Starting WhatsApp service on port 3001...
echo.
echo Keep this window open!
echo.
echo Press Ctrl+C to stop the service
echo ========================================
echo.

node index.js

pause

