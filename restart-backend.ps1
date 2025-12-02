Write-Host "=== RESTARTING BACKEND EXPRESS SERVICE ===" -ForegroundColor Cyan
Write-Host ""

$backendPath = "b:\ASAH FEBE AI\ASAH 2025 MINING VALUE_A25-CS113_AC-05\backend-express"

Write-Host "Stopping existing Node processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.Path -like "*node.exe*"
} | Stop-Process -Force

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "Starting backend server..." -ForegroundColor Green
Set-Location $backendPath

$env:NODE_ENV = "development"

Write-Host "Running: npm run dev" -ForegroundColor Gray
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; npm run dev"

Write-Host ""
Write-Host "✅ Backend service restarted!" -ForegroundColor Green
Write-Host "   Please check the new terminal window" -ForegroundColor Gray
Write-Host ""
