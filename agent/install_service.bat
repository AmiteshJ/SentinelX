@echo off
cd /d "%~dp0"
echo ========================================================
echo Installing SentinelX Host Protection Background Service
echo ========================================================
echo.

:: Check for Administrator privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Administrator permissions required.
    echo Please right-click this batch file and select 'Run as administrator'.
    pause
    exit /b 1
)

:: Get full path to python and main.py
for /f "delims=" %%i in ('where python') do set PYTHON_EXE=%%i
set AGENT_DIR=%~dp0
set AGENT_DIR=%AGENT_DIR:~0,-1%

echo Creating Windows Scheduled Task 'SentinelX_Agent'...
schtasks /create /tn "SentinelX_Agent" /tr "\"%PYTHON_EXE%\" \"%AGENT_DIR%\main.py\"" /sc onlogon /rl highest /f

if %errorLevel% equ 0 (
    echo.
    echo [SUCCESS] SentinelX Agent service successfully registered!
    echo It will now run automatically in the background whenever you log into Windows.
    echo.
    echo Starting the service now...
    schtasks /run /tn "SentinelX_Agent"
) else (
    echo.
    echo [FAILED] Could not register scheduled task.
)

echo.
pause
