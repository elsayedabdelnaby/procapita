# WhatsApp Service - Production Setup Guide

## Problem
The WhatsApp service is a separate Node.js application that must be running continuously. If it stops, you'll get a 503 Service Unavailable error.

## Solution: Use PM2 Process Manager

PM2 is a production process manager for Node.js that will:
- Keep your service running 24/7
- Automatically restart if it crashes
- Start on server reboot
- Monitor and log your service

## Step 1: Install PM2 on Your Server

**Via SSH, connect to your server and run:**

```bash
npm install -g pm2
```

Or if you need sudo:
```bash
sudo npm install -g pm2
```

## Step 2: Install WhatsApp Service Dependencies

On your server, navigate to your project and install dependencies:

```bash
cd /path/to/your/project/whatsapp-service
npm install --production
```

## Step 3: Configure Environment Variables

Create or edit `.env` file in your Laravel project root:

```env
WHATSAPP_SERVICE_URL=http://localhost:3001
```

**For production, if the service is on a different server:**
```env
WHATSAPP_SERVICE_URL=http://your-server-ip:3001
# Or if using domain:
WHATSAPP_SERVICE_URL=http://whatsapp-service.yourdomain.com:3001
```

## Step 4: Start WhatsApp Service with PM2

Navigate to the whatsapp-service directory:

```bash
cd /path/to/your/project/whatsapp-service
pm2 start index.js --name whatsapp-service
```

## Step 5: Configure PM2 to Start on Server Reboot

```bash
pm2 startup
```

This will generate a command. **Copy and run that command** (it will be different for each system).

Then save the PM2 process list:
```bash
pm2 save
```

## Step 6: Verify It's Running

Check status:
```bash
pm2 status
```

View logs:
```bash
pm2 logs whatsapp-service
```

## Step 7: Useful PM2 Commands

```bash
# Stop the service
pm2 stop whatsapp-service

# Restart the service
pm2 restart whatsapp-service

# View logs
pm2 logs whatsapp-service

# Monitor (real-time)
pm2 monit

# Delete from PM2
pm2 delete whatsapp-service
```

## Alternative: Using systemd (Linux)

If you prefer systemd, create a service file:

### Create service file:
```bash
sudo nano /etc/systemd/system/whatsapp-service.service
```

### Add this content:
```ini
[Unit]
Description=WhatsApp Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/your/project/whatsapp-service
ExecStart=/usr/bin/node /path/to/your/project/whatsapp-service/index.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=whatsapp-service

[Install]
WantedBy=multi-user.target
```

### Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable whatsapp-service
sudo systemctl start whatsapp-service
```

### Check status:
```bash
sudo systemctl status whatsapp-service
```

## Firewall Configuration

Make sure port 3001 is accessible (if needed):

```bash
# For UFW (Ubuntu)
sudo ufw allow 3001/tcp

# For firewalld (CentOS/RHEL)
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --reload
```

## Troubleshooting

### Service not starting?
1. Check logs: `pm2 logs whatsapp-service`
2. Check if port 3001 is already in use: `netstat -tulpn | grep 3001`
3. Verify Node.js is installed: `node --version`

### Still getting 503 errors?
1. Verify service is running: `pm2 status`
2. Check Laravel `.env` has correct `WHATSAPP_SERVICE_URL`
3. Test the service directly: `curl http://localhost:3001/api/whatsapp/1/status`
4. Check firewall rules

### Service keeps crashing?
1. Check PM2 logs: `pm2 logs whatsapp-service --lines 100`
2. Check system resources: `pm2 monit`
3. Verify all dependencies are installed: `cd whatsapp-service && npm install`

## Quick Setup Script

You can create a setup script on your server:

```bash
#!/bin/bash
# whatsapp-service-setup.sh

cd /path/to/your/project/whatsapp-service
npm install --production
pm2 start index.js --name whatsapp-service
pm2 save
pm2 startup
```

Make it executable:
```bash
chmod +x whatsapp-service-setup.sh
./whatsapp-service-setup.sh
```

## Important Notes

1. **The WhatsApp service must run continuously** - PM2 ensures this
2. **Sessions are stored** in `storage/app/whatsapp/sessions/` - make sure this directory is writable
3. **Each company has a separate session** - stored in `company_{id}` folders
4. **QR codes expire after 5 minutes** - users must scan quickly
5. **The service uses Puppeteer** - ensure your server has required dependencies for headless Chrome

## For Shared Hosting

If you're on shared hosting without SSH access:
- Contact your hosting provider to set up a Node.js service
- Or use a separate VPS/server for the WhatsApp service
- Update `WHATSAPP_SERVICE_URL` to point to that server

