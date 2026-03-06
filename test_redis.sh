#!/bin/bash
# Redis Backend Test Runner
# Runs the Redis connectivity test from anywhere

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "Running Redis Backend Connectivity Test..."
echo "Project Root: $PROJECT_ROOT"
echo ""

# Run the test
cd "$PROJECT_ROOT"
python3 scripts/test_redis_backend.py
