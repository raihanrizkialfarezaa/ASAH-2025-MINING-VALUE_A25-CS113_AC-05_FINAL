#!/usr/bin/env pwsh
# Production Build & Serve Script for Frontend

Write-Host "================================" -ForegroundColor Cyan
Write-Host "🏗️  Building Production Frontend" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to frontend directory
Set-Location "b:\ASAH FEBE AI\ASAH 2025 MINING VALUE_A25-CS113_AC-05\mining-ops-frontend"

# Check if .env exists
if (-Not (Test-Path ".env")) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    Write-Host "Creating .env from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    
    Write-Host ""
    Write-Host "⚠️  Please configure .env file with Cloudflare domains:" -ForegroundColor Yellow
    Write-Host "REACT_APP_API_URL=https://backend-express.viviashop.com/api/v1" -ForegroundColor White
    Write-Host "REACT_APP_AI_SERVICE_URL=https://fastapi-service.viviashop.com" -ForegroundColor White
    Write-Host "REACT_APP_WS_URL=wss://mining-supply-chain-a25-cs113.viviashop.com" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter after configuring .env"
}

# Show current .env configuration
Write-Host "📋 Current Configuration:" -ForegroundColor Green
Get-Content ".env"
Write-Host ""

# Build production
Write-Host "🔨 Building production bundle..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Build successful!" -ForegroundColor Green
Write-Host ""

# Check if serve is installed
Write-Host "📦 Checking if 'serve' is installed..." -ForegroundColor Yellow
$serveInstalled = Get-Command serve -ErrorAction SilentlyContinue

if (-Not $serveInstalled) {
    Write-Host "⚠️  'serve' is not installed globally." -ForegroundColor Yellow
    $install = Read-Host "Install 'serve' globally? (y/n)"
    
    if ($install -eq "y") {
        Write-Host "Installing serve..." -ForegroundColor Yellow
        npm install -g serve
    }
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "🚀 Starting Production Server" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Local: http://localhost:3001" -ForegroundColor Green
Write-Host "Public: https://mining-supply-chain-a25-cs113.viviashop.com" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Serve production build
npx serve -s build -l 3001
