# WhatsApp Service - Windows Auto-Start Setup

## Current Status
✅ Your WhatsApp service is running with PM2!

## Problem
On Windows, `pm2 startup` doesn't work because Windows doesn't use Linux init systems.

## Solution Options

### Option 1: Use PM2 Windows Service (Recommended)

Install PM2 Windows Service:

```bash
npm install -g pm2-windows-startup
pm2-startup install
```

Then save your PM2 processes:
```bash
pm2 save
```

This will create a Windows service that starts PM2 on boot.

### Option 2: Use NSSM (Non-Sucking Service Manager)

1. Download NSSM from: https://nssm.cc/download
2. Extract it to a folder (e.g., `C:\nssm`)
3. Open Command Prompt as Administrator
4. Run:

```cmd
cd C:\nssm\win64
nssm install WhatsAppService "C:\laragon\bin\nodejs\node-v22\node.exe" "C:\laragon\www\karamany\ubercrm\whatsapp-service\index.js"
nssm set WhatsAppService AppDirectory "C:\laragon\www\karamany\ubercrm\whatsapp-service"
nssm set WhatsAppService Description "WhatsApp Service for UberCRM"
nssm start WhatsAppService
```

### Option 3: Windows Task Scheduler (Simple but less robust)

1. Open Task Scheduler (search "Task Scheduler" in Windows)
2. Create Basic Task
3. Name: "WhatsApp Service"
4. Trigger: "When the computer starts"
5. Action: "Start a program"
6. Program: `C:\laragon\bin\nodejs\node-v22\node.exe`
7. Arguments: `C:\laragon\www\karamany\ubercrm\whatsapp-service\index.js`
8. Start in: `C:\laragon\www\karamany\ubercrm\whatsapp-service`
9. Check "Run with highest privileges"

### Option 4: Use PM2 with Windows Service Wrapper

```bash
npm install -g pm2-windows-service
pm2-service-install
```

Then:
```bash
pm2 save
```

## Quick Commands (Current Session)

Your service is already running! Use these commands:

```bash
# Check status
pm2 status

# View logs
pm2 logs whatsapp-service

# Restart
pm2 restart whatsapp-service

# Stop
pm2 stop whatsapp-service

# Monitor
pm2 monit
```

## Recommended: Option 1 (PM2 Windows Service)

This is the easiest and most reliable for Windows:

```bash
npm install -g pm2-windows-startup
pm2-startup install
pm2 save
```

After this, PM2 will automatically start on Windows boot and restore your WhatsApp service.

## Verify Auto-Start

After setting up, restart your computer and check:

```bash
pm2 status
```

If the service is running, auto-start is working! ✅

