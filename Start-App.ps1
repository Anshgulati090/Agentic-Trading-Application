# Start-App.ps1
# Launch backend + frontend for AgenticTrading

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$venvUvicorn = Join-Path $rootDir ".venv\Scripts\uvicorn.exe"
$frontendDir = Join-Path $rootDir "frontend"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  AgenticTrading - Development Launcher" -ForegroundColor Cyan  
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$backendPort = 8000
$existing = Get-NetTCPConnection -LocalPort $backendPort -State Listen -ErrorAction SilentlyContinue

if ($existing) {
    Write-Host "[WARN] Port 8000 already in use - backend may already be running." -ForegroundColor Yellow
} else {
    Write-Host "[1/2] Starting backend on port 8000 ..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$rootDir`"; & `"$venvUvicorn`" backend.api.main:app --host 0.0.0.0 --port 8000" -WindowStyle Normal
    Start-Sleep -Seconds 3
}

Write-Host "[2/2] Starting frontend on port 3000 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendDir'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "--------------------------------------------" -ForegroundColor DarkGray
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "  Backend:  http://localhost:8000" -ForegroundColor White
Write-Host "  API Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host "--------------------------------------------" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Both servers are starting. Please open:" -ForegroundColor Yellow
Write-Host "  http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Demo login: demo@agentictrading.com / demo123" -ForegroundColor Green
Write-Host ""
