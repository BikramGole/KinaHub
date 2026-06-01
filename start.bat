@echo off
:: Kina Dev Launcher for Windows
:: This script launches the PowerShell launcher which has the full feature set.
:: Supports the same flags: --offline, --no-browser, --reset-api-key

powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%~dp0start.ps1" %*
