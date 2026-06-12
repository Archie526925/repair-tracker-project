@echo off
powershell -ExecutionPolicy Bypass -File "%~dp0install.ps1"
if %errorLevel% neq 0 pause
