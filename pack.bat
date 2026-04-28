@echo off
:: 打包脚本入口 (Windows 双击运行)
:: 如需携带数据库: 在 PowerShell 中运行 .\pack.ps1 -WithData

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0pack.ps1"
pause
