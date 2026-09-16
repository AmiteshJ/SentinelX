@echo off
cd /d "%~dp0"
echo Installing requirements...
python -m pip install -r requirements.txt
echo.
echo Starting SentinelX Agent...
python main.py
pause
