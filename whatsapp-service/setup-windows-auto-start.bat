@echo off
REM Setup WhatsApp Service Auto-Start on Windows
REM This script installs PM2 Windows Service for auto-start on boot

echo ========================================
echo WhatsApp Service - Windows Auto-Start Setup
echo ========================================
echo.

echo Step 1: Installing PM2 Windows Service...
call npm install -g pm2-windows-startup

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Failed to install pm2-windows-startup
    echo Please run this script as Administrator
    pause
    exit /b 1
)

echo.
echo Step 2: Installing PM2 startup service...
call pm2-startup install

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ⚠️  pm2-startup install failed. Trying alternative method...
    call pm2-service-install
)

echo.
echo Step 3: Saving PM2 process list...
call pm2 save

echo.
echo ✅ Setup complete!
echo.
echo Your WhatsApp service will now start automatically on Windows boot.
echo.
echo To verify, restart your computer and run: pm2 status
echo.
pause

