@echo off
chcp 65001 >nul
title NexSpace - Sync Configuration
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0sync-config.ps1"
echo.
pause

