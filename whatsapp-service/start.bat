@echo off
echo Starting WhatsApp Service...
cd /d %~dp0
if not exist node_modules (
    echo Installing dependencies...
    call npm install
)
echo Starting service on port 3001...
node index.js

