Write-Host "Starting WhatsApp Service..." -ForegroundColor Green
Set-Location $PSScriptRoot

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "Starting service on port 3001..." -ForegroundColor Green
node index.js

