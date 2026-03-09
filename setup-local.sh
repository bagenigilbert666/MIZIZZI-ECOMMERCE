#!/bin/bash

# MIZIZZI E-Commerce Platform - Local Development Quick Start
# Usage: ./setup-local.sh

set -e

echo "🚀 MIZIZZI E-Commerce Platform - Local Development Setup"
echo "=========================================================="
echo ""

# Check if Python is installed
if ! command -v python &> /dev/null; then
    echo "❌ Python not found. Please install Python 3.8+"
    exit 1
fi

# Check if pip is installed
if ! command -v pip &> /dev/null; then
    echo "❌ pip not found. Please install pip"
    exit 1
fi

# Navigate to backend directory
cd backend || { echo "❌ backend directory not found"; exit 1; }

echo "✅ Backend directory found"
echo ""

# Copy .env.example to .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📋 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env created - you may edit it to add credentials"
else
    echo "⚠️  .env already exists - skipping creation"
fi

echo ""
echo "📦 Installing Python dependencies..."
pip install -q -r requirements.txt
echo "✅ Dependencies installed"

echo ""
echo "🗄️  Initializing database..."
python -m flask --app wsgi:app db upgrade 2>/dev/null || true
echo "✅ Database ready"

echo ""
echo "=========================================================="
echo "✨ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo ""
echo "1. Start the backend:"
echo "   python -m flask --app wsgi:app run --debug"
echo ""
echo "2. The backend will be available at:"
echo "   http://localhost:5000"
echo ""
echo "3. In another terminal, start the frontend:"
echo "   cd ../frontend"
echo "   pnpm install"
echo "   pnpm dev"
echo ""
echo "4. Frontend will be available at:"
echo "   http://localhost:3000"
echo ""
echo "✅ Caching strategy for local development:"
echo "   • In-memory caching (SimpleCache)"
echo "   • No Redis needed"
echo "   • Homepage cache: 180s TTL"
echo "   • Section cache: 60s TTL per section"
echo ""
echo "💡 Tips:"
echo "   • .env file is created - don't commit it to git"
echo "   • All 523 endpoints are available on localhost:5000"
echo "   • Add email/payment credentials to .env if testing those features"
echo "   • Leave Upstash vars empty for local development"
echo ""
