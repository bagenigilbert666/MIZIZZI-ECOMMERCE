#!/bin/bash

# Database Index Creation Script for Products Routes
# This script executes SQL indexes directly using psql

set -e

echo "=========================================="
echo "Database Index Creation for Products"
echo "=========================================="
echo ""

# Use DATABASE_URL environment variable or prompt for connection
if [ -z "$DATABASE_URL" ]; then
    echo "DATABASE_URL not set. Using default Neon PostgreSQL..."
    DATABASE_URL="postgresql://neondb_owner:npg_0gMwASZYo9pJ@ep-shiny-term-adlossxs-pooler.c-2.us-east-1.aws.neon.tech/mizizzi_project?sslmode=require"
fi

echo "[*] Connecting to database..."
echo "[*] Database URL: ${DATABASE_URL:0:60}..."
echo ""

# Execute the enhanced indexes SQL file
echo "[*] Creating enhanced product indexes..."
psql "$DATABASE_URL" < /vercel/share/v0-project/backend/scripts/enhanced_product_indexes.sql

# Run ANALYZE
echo ""
echo "[*] Updating table statistics..."
psql "$DATABASE_URL" -c "ANALYZE products;"

echo ""
echo "[✓] Index initialization completed successfully!"
echo ""
echo "Summary:"
echo "  - Created composite indexes for common filter combinations"
echo "  - Added conditional indexes for boolean flags"
echo "  - Optimized sorting and pagination queries"
echo "  - Updated query statistics"
echo ""
