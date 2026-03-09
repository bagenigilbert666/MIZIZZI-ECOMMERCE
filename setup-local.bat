@echo off
REM MIZIZZI E-Commerce Platform - Local Development Quick Start (Windows)
REM Usage: setup-local.bat

setlocal enabledelayedexpansion

echo.
echo 🚀 MIZIZZI E-Commerce Platform - Local Development Setup
echo ===========================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python not found. Please install Python 3.8+
    exit /b 1
)

REM Check if pip is installed
pip --version >nul 2>&1
if errorlevel 1 (
    echo ❌ pip not found. Please install pip
    exit /b 1
)

REM Navigate to backend directory
cd backend
if errorlevel 1 (
    echo ❌ backend directory not found
    exit /b 1
)

echo ✅ Backend directory found
echo.

REM Copy .env.example to .env if it doesn't exist
if not exist .env (
    echo 📋 Creating .env file from template...
    copy .env.example .env >nul
    echo ✅ .env created - you may edit it to add credentials
) else (
    echo ⚠️  .env already exists - skipping creation
)

echo.
echo 📦 Installing Python dependencies...
pip install -q -r requirements.txt
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    exit /b 1
)
echo ✅ Dependencies installed

echo.
echo 🗄️  Initializing database...
python -m flask --app wsgi:app db upgrade >nul 2>&1
echo ✅ Database ready

echo.
echo ===========================================================
echo ✨ Setup complete!
echo.
echo 🎯 Next steps:
echo.
echo 1. Start the backend:
echo    python -m flask --app wsgi:app run --debug
echo.
echo 2. The backend will be available at:
echo    http://localhost:5000
echo.
echo 3. In another terminal, start the frontend:
echo    cd ..\frontend
echo    pnpm install
echo    pnpm dev
echo.
echo 4. Frontend will be available at:
echo    http://localhost:3000
echo.
echo ✅ Caching strategy for local development:
echo    • In-memory caching (SimpleCache)
echo    • No Redis needed
echo    • Homepage cache: 180s TTL
echo    • Section cache: 60s TTL per section
echo.
echo 💡 Tips:
echo    • .env file is created - don't commit it to git
echo    • All 523 endpoints are available on localhost:5000
echo    • Add email/payment credentials to .env if testing those features
echo    • Leave Upstash vars empty for local development
echo.
