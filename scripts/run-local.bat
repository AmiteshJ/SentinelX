@echo off
echo Starting SentinelX services on Windows...

start "SentinelX Backend API" cmd /k "cd /d %~dp0..\backend && .\.venv\Scripts\activate.bat && python -m uvicorn app.main:app --reload --port 8000"
start "SentinelX Event Worker" cmd /k "cd /d %~dp0..\backend && .\.venv\Scripts\activate.bat && python -m app.workers.event_worker"
start "SentinelX Frontend" cmd /k "cd /d %~dp0..\frontend && npm run dev"

echo All 3 SentinelX services started in separate windows!
