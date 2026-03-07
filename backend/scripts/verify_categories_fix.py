#!/usr/bin/env python3
"""
Quick verification script to test categories query performance after fix.
Runs the categories loader multiple times and reports timing.

Usage:
    cd backend
    uv run ../scripts/verify_categories_fix.py
"""

import time
import sys
import os

# Add backend package directory to path (fix incorrect 'backend/backend' path)
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from app.services.homepage.get_homepage_categories import get_homepage_categories

def test_categories_performance():
    """Test categories loading performance."""
    
    app = create_app()
    
    with app.app_context():
        print("[v0] Starting categories performance test...")
        print("-" * 60)
        
        # Warm up (first call may have connection overhead)
        print("[v0] Warming up...")
        get_homepage_categories()
        
        # Run multiple iterations
        iterations = 5
        times = []
        
        for i in range(iterations):
            start = time.perf_counter()
            result = get_homepage_categories()
            elapsed = (time.perf_counter() - start) * 1000  # Convert to ms
            times.append(elapsed)
            
            print(f"[v0] Iteration {i+1}: {elapsed:.2f}ms - {len(result)} categories loaded")
        
        avg_time = sum(times) / len(times)
        min_time = min(times)
        max_time = max(times)
        
        print("-" * 60)
        print(f"[v0] Average: {avg_time:.2f}ms")
        print(f"[v0] Min:     {min_time:.2f}ms")
        print(f"[v0] Max:     {max_time:.2f}ms")
        print("-" * 60)
        
        # Expected results after fix:
        # - Cold query: <50ms (was 34s = 34000ms)
        # - Cached query: <5ms
        # - Average should be <20ms after cache warms
        
        if avg_time < 50:
            print("[v0] ✅ PASS: Categories loading is fast (<50ms average)")
            return True
        else:
            print(f"[v0] ⚠️  WARNING: Categories still slow ({avg_time:.2f}ms average)")
            print("[v0] If this is the first cold run, this is expected.")
            print("[v0] If running again, cached performance should be <5ms.")
            return False

if __name__ == '__main__':
    try:
        success = test_categories_performance()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"[v0] ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
