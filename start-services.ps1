Write-Host "=== Starting All Services ===" -ForegroundColor Cyan
Write-Host ""

$rootPath = "B:\ASAH FEBE AI\ASAH 2025 MINING VALUE_A25-CS113_AC-05"

Write-Host "1. Starting Backend Express.js..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootPath\backend-express'; npm start"

Start-Sleep -Seconds 3

Write-Host "2. Starting AI Service (Python/FastAPI)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootPath\mining-ops-ai'; .\venv\Scripts\activate; python -m uvicorn main:app --reload --port 8000"

Start-Sleep -Seconds 3

Write-Host "3. Starting Frontend React..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootPath\mining-ops-frontend'; npm start"

Write-Host ""
Write-Host "=== All Services Started ===" -ForegroundColor Green
Write-Host "Backend: http://localhost:3000" -ForegroundColor White
Write-Host "AI Service: http://localhost:8000" -ForegroundColor White
Write-Host "Frontend: http://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to close this window (services will continue running)..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
