#!/bin/bash

# WhatsApp Service PM2 Startup Script
# This script sets up and starts the WhatsApp service using PM2

echo "🚀 Starting WhatsApp Service with PM2..."

# Navigate to script directory
cd "$(dirname "$0")"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 is not installed. Installing PM2..."
    npm install -g pm2
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install --production
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Stop existing instance if running
pm2 stop whatsapp-service 2>/dev/null
pm2 delete whatsapp-service 2>/dev/null

# Start the service
echo "▶️  Starting service..."
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

echo "✅ WhatsApp Service started!"
echo ""
echo "Useful commands:"
echo "  pm2 status              - Check service status"
echo "  pm2 logs whatsapp-service - View logs"
echo "  pm2 restart whatsapp-service - Restart service"
echo "  pm2 stop whatsapp-service - Stop service"
echo "  pm2 monit               - Monitor in real-time"
echo ""

