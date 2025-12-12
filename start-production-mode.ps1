#!/usr/bin/env pwsh
# Start All Services in Production Mode

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "🚀 Starting All Services (Production Mode)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$rootPath = "b:\ASAH FEBE AI\ASAH 2025 MINING VALUE_A25-CS113_AC-05"

# Function to start a service in a new window
function Start-ServiceWindow {
    param(
        [string]$Title,
        [string]$Command,
        [string]$WorkingDir
    )
    
    Write-Host "Starting $Title..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$WorkingDir'; Write-Host '$Title' -ForegroundColor Green; $Command"
}

# Check if services are ready
Write-Host "🔍 Checking prerequisites..." -ForegroundColor Yellow
Write-Host ""

# Check Backend Express
$backendPath = Join-Path $rootPath "backend-express"
if (-Not (Test-Path (Join-Path $backendPath "node_modules"))) {
    Write-Host "⚠️  Backend dependencies not installed" -ForegroundColor Yellow
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    Set-Location $backendPath
    npm install
}

# Check Frontend Build
$frontendPath = Join-Path $rootPath "mining-ops-frontend"
$buildPath = Join-Path $frontendPath "build"
if (-Not (Test-Path $buildPath)) {
    Write-Host "⚠️  Frontend production build not found" -ForegroundColor Yellow
    Write-Host "Building frontend..." -ForegroundColor Yellow
    Set-Location $frontendPath
    npm run build
}

# Check AI Service
$aiPath = Join-Path $rootPath "mining-ops-ai"
$venvPath = Join-Path $aiPath "venv"
if (-Not (Test-Path $venvPath)) {
    Write-Host "❌ AI service virtual environment not found!" -ForegroundColor Red
    Write-Host "Please create virtual environment first:" -ForegroundColor Yellow
    Write-Host "cd $aiPath" -ForegroundColor White
    Write-Host "python -m venv venv" -ForegroundColor White
    Write-Host ".\venv\Scripts\activate" -ForegroundColor White
    Write-Host "pip install -r requirements.txt" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "✅ All prerequisites satisfied" -ForegroundColor Green
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "🎬 Launching Services..." -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Start Backend Express
Start-ServiceWindow `
    -Title "Backend Express (Port 3000)" `
    -Command "npm start" `
    -WorkingDir $backendPath

Start-Sleep -Seconds 2

# Start FastAPI
Start-ServiceWindow `
    -Title "FastAPI AI Service (Port 8000)" `
    -Command ".\venv\Scripts\activate; uvicorn api:app --host 0.0.0.0 --port 8000 --reload" `
    -WorkingDir $aiPath

Start-Sleep -Seconds 2

# Start Frontend Production
Start-ServiceWindow `
    -Title "Frontend Production (Port 3001)" `
    -Command "npx serve -s build -l 3001" `
    -WorkingDir $frontendPath

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "✅ All Services Started!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Access Points:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Local Access:" -ForegroundColor Yellow
Write-Host "  Frontend:  http://localhost:3001" -ForegroundColor White
Write-Host "  Backend:   http://localhost:3000" -ForegroundColor White
Write-Host "  AI API:    http://localhost:8000" -ForegroundColor White
Write-Host ""
Write-Host "Public Access (via Cloudflare):" -ForegroundColor Yellow
Write-Host "  Frontend:  https://mining-supply-chain-a25-cs113.viviashop.com" -ForegroundColor Green
Write-Host "  Backend:   https://backend-express.viviashop.com" -ForegroundColor Green
Write-Host "  AI API:    https://fastapi-service.viviashop.com" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Notes:" -ForegroundColor Cyan
Write-Host "  - Each service runs in a separate window" -ForegroundColor White
Write-Host "  - Close each window to stop the respective service" -ForegroundColor White
Write-Host "  - Make sure Cloudflare tunnel is running" -ForegroundColor White
Write-Host ""
