#!/bin/bash

# MIZIZZI E-Commerce Platform - Verification & Health Check Script
# This script verifies that your local development environment is properly configured

set -e

echo ""
echo "🔍 MIZIZZI E-Commerce Platform - Environment Verification"
echo "=========================================================="
echo ""

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check command exists
check_command() {
    if command -v "$1" &> /dev/null; then
        echo -e "${GREEN}✅${NC} $1 is installed"
        return 0
    else
        echo -e "${RED}❌${NC} $1 is not installed"
        return 1
    fi
}

# Function to check file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅${NC} $1 exists"
        return 0
    else
        echo -e "${RED}❌${NC} $1 not found"
        return 1
    fi
}

# Function to check environment variable
check_env() {
    if [ -n "${!1}" ]; then
        echo -e "${GREEN}✅${NC} $1 is set"
        return 0
    else
        echo -e "${YELLOW}⚠️ ${NC} $1 is not set"
        return 1
    fi
}

echo "📋 System Requirements"
echo "--------------------"
check_command python
check_command pip
check_command git

echo ""
echo "🗂️  Project Structure"
echo "--------------------"
check_file "backend/.env"
check_file "backend/.env.example"
check_file "backend/requirements.txt"
check_file "backend/app/__init__.py"

echo ""
echo "🔧 Environment Configuration"
echo "---------------------------"
if [ -f "backend/.env" ]; then
    export $(cat backend/.env | grep -v '#' | xargs)
    check_env "FLASK_CONFIG"
    check_env "DATABASE_URL"
    check_env "JWT_SECRET_KEY"
fi

echo ""
echo "📦 Python Dependencies"
echo "---------------------"
cd backend

# Check if virtual environment exists
if [ -d "venv" ]; then
    echo -e "${GREEN}✅${NC} Virtual environment exists"
else
    echo -e "${YELLOW}⚠️ ${NC} Virtual environment not found"
    echo "   Run: python -m venv venv"
fi

# Check if requirements are installed
if python -c "import flask" 2>/dev/null; then
    echo -e "${GREEN}✅${NC} Flask is installed"
else
    echo -e "${RED}❌${NC} Flask not installed"
    echo "   Run: pip install -r requirements.txt"
fi

if python -c "import sqlalchemy" 2>/dev/null; then
    echo -e "${GREEN}✅${NC} SQLAlchemy is installed"
else
    echo -e "${RED}❌${NC} SQLAlchemy not installed"
    echo "   Run: pip install -r requirements.txt"
fi

echo ""
echo "🗄️  Database Connection"
echo "---------------------"

# Test database connection
if python -c "
import os
os.environ.setdefault('FLASK_CONFIG', 'development')
from app import create_app
app = create_app()
with app.app_context():
    from sqlalchemy import text
    try:
        from app.configuration.extensions import db
        with db.engine.connect() as conn:
            conn.execute(text('SELECT 1'))
        print('✅ Database connection successful')
    except Exception as e:
        print(f'❌ Database connection failed: {e}')
" 2>/dev/null; then
    echo -e "${GREEN}✅${NC} Database is reachable"
else
    echo -e "${RED}❌${NC} Database connection failed"
    echo "   Check DATABASE_URL in backend/.env"
fi

echo ""
echo "🚀 Ready to Start?"
echo "------------------"

# Check if backend can start
python -c "
from app import create_app
try:
    app = create_app()
    print('✅ Backend app factory works')
except Exception as e:
    print(f'❌ Backend app factory failed: {e}')
" 2>/dev/null || true

cd ..

echo ""
echo "📋 API Endpoints Available"
echo "---------------------------"
echo "When backend is running (python -m flask --app wsgi:app run --debug):"
echo ""
echo "• Health Check:"
echo "  curl http://localhost:5000/api/health-check"
echo ""
echo "• Products:"
echo "  curl http://localhost:5000/api/products"
echo ""
echo "• Homepage:"
echo "  curl http://localhost:5000/api/homepage"
echo ""

echo "=========================================================="
echo ""
echo "✨ Verification Complete!"
echo ""
echo "🎯 Next Steps:"
echo "1. Start backend: python -m flask --app wsgi:app run --debug"
echo "2. In another terminal, start frontend: cd frontend && pnpm dev"
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "📚 Documentation:"
echo "• Quick Start: QUICK_REFERENCE.md"
echo "• Setup Guide: ENVIRONMENT_SETUP_GUIDE.md"
echo "• API Endpoints: http://localhost:5000 (when running)"
echo ""
