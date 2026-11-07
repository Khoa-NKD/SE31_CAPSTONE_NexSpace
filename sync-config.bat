@echo off
chcp 65001 >nul
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0sync-config.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Da xay ra loi khi dong bo cau hinh.
    pause
)
