# Starts backend API, event worker, and frontend dev server in 3 separate PowerShell windows on Windows.

$rootDir = Split-Path -Parent $PSScriptRoot

Write-Host "Starting SentinelX services on Windows..." -ForegroundColor Green

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\backend'; .\.venv\Scripts\Activate.ps1; python -m uvicorn app.main:app --reload --port 8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\backend'; .\.venv\Scripts\Activate.ps1; python -m app.workers.event_worker"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\frontend'; npm run dev"

Write-Host "Launched all 3 services in separate windows!" -ForegroundColor Cyan
