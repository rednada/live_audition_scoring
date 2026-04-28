@echo off
:: 以管理员权限运行 PowerShell 脚本，临时放开执行策略
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1"
pause
