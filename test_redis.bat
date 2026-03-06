@echo off
REM Redis Backend Test Runner for Windows
REM Runs the Redis connectivity test from anywhere

setlocal
for %%I in ("%~dp0.") do set "PROJECT_ROOT=%%~dpI"

echo Running Redis Backend Connectivity Test...
echo Project Root: %PROJECT_ROOT%
echo.

REM Run the test
cd /d "%PROJECT_ROOT%"
python scripts/test_redis_backend.py
pause
