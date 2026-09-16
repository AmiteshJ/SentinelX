@echo off
cd /d "%~dp0"
echo ========================================================
echo Uninstalling SentinelX Host Protection Background Service
echo ========================================================
echo.

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Administrator permissions required.
    echo Please right-click this batch file and select 'Run as administrator'.
    pause
    exit /b 1
)

echo Removing Windows Scheduled Task 'SentinelX_Agent'...
schtasks /delete /tn "SentinelX_Agent" /f

if %errorLevel% equ 0 (
    echo.
    echo [SUCCESS] SentinelX Agent background service successfully uninstalled.
) else (
    echo.
    echo [INFO] Task was not found or already deleted.
)

echo.
pause
