@echo off
REM WhatsApp Service PM2 Startup Script for Windows
REM This script sets up and starts the WhatsApp service using PM2

echo 🚀 Starting WhatsApp Service with PM2...

REM Navigate to script directory
cd /d "%~dp0"

REM Check if PM2 is installed
where pm2 >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ PM2 is not installed. Installing PM2...
    npm install -g pm2
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    call npm install --production
)

REM Create logs directory if it doesn't exist
if not exist "logs" mkdir logs

REM Stop existing instance if running
pm2 stop whatsapp-service 2>nul
pm2 delete whatsapp-service 2>nul

REM Start the service
echo ▶️  Starting service...
pm2 start ecosystem.config.js

REM Save PM2 process list
pm2 save

echo ✅ WhatsApp Service started!
echo.
echo Useful commands:
echo   pm2 status              - Check service status
echo   pm2 logs whatsapp-service - View logs
echo   pm2 restart whatsapp-service - Restart service
echo   pm2 stop whatsapp-service - Stop service
echo   pm2 monit               - Monitor in real-time
echo.
pause

