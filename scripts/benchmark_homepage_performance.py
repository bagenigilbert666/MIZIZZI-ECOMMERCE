#!/usr/bin/env python3
"""
Homepage Performance Benchmark Script

This script measures the performance of the homepage API across cold and cached requests,
and verifies that the optimizations are working as expected.

Usage:
    python scripts/benchmark_homepage_performance.py [--url http://localhost:5000] [--requests 10]
"""

import requests
import time
import statistics
import json
import sys
import argparse
from typing import List, Dict, Tuple, Any
from datetime import datetime

# Color codes for terminal output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def print_header(text: str):
    """Print a formatted header."""
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*70}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text:^70}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*70}{Colors.ENDC}\n")

def print_section(text: str):
    """Print a formatted section header."""
    print(f"\n{Colors.CYAN}{Colors.BOLD}{text}{Colors.ENDC}")
    print(f"{Colors.CYAN}{'-'*70}{Colors.ENDC}")

def print_success(text: str):
    """Print success message."""
    print(f"{Colors.GREEN}✓ {text}{Colors.ENDC}")

def print_warning(text: str):
    """Print warning message."""
    print(f"{Colors.YELLOW}⚠ {text}{Colors.ENDC}")

def print_error(text: str):
    """Print error message."""
    print(f"{Colors.RED}✗ {text}{Colors.ENDC}")

def print_info(text: str):
    """Print info message."""
    print(f"{Colors.BLUE}ℹ {text}{Colors.ENDC}")

def benchmark_homepage(base_url: str, cache_bust: bool = True) -> Dict[str, Any]:
    """
    Benchmark a single homepage request.
    
    Args:
        base_url: Base URL of the homepage API (e.g., http://localhost:5000)
        cache_bust: If True, adds cache-busting parameter
    
    Returns:
        Dictionary with timing and cache information
    """
    url = f"{base_url}/api/homepage"
    
    # Add cache-busting parameter to bypass Redis cache if requested
    if cache_bust:
        url += f"?_cb={int(time.time() * 1000)}"
    
    start_time = time.time()
    
    try:
        response = requests.get(url, timeout=60)
        elapsed_ms = (time.time() - start_time) * 1000
        
        if response.status_code != 200:
            return {
                "success": False,
                "error": f"HTTP {response.status_code}",
                "elapsed_ms": elapsed_ms
            }
        
        data = response.json()
        
        return {
            "success": True,
            "elapsed_ms": elapsed_ms,
            "status": response.status_code,
            "cache_status": response.headers.get("X-Cache", "UNKNOWN"),
            "cache_key": response.headers.get("X-Cache-Key", ""),
            "aggregation_time_ms": response.headers.get("X-Aggregation-Time-Ms", "N/A"),
            "partial_failures": response.headers.get("X-Partial-Failures", ""),
            "all_succeeded": data.get("meta", {}).get("all_succeeded", False),
            "sections_loaded": len([s for s in data.get("data", {}).keys() if data["data"][s]]),
            "content_length": len(response.content),
        }
    except requests.exceptions.Timeout:
        return {
            "success": False,
            "error": "Timeout (>60s)",
            "elapsed_ms": (time.time() - start_time) * 1000
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "elapsed_ms": (time.time() - start_time) * 1000
        }

def run_benchmark_suite(base_url: str, num_requests: int = 5) -> Tuple[List[Dict], List[Dict]]:
    """
    Run a complete benchmark suite with cold and cached requests.
    
    Args:
        base_url: Base URL of the homepage API
        num_requests: Number of requests to run in each category
    
    Returns:
        Tuple of (cold_results, cached_results)
    """
    cold_results = []
    cached_results = []
    
    print_section("COLD REQUESTS (Cache Bypass)")
    print(f"Running {num_requests} requests with cache bypass...\n")
    
    for i in range(num_requests):
        print_info(f"Request {i+1}/{num_requests}...", end=" ")
        result = benchmark_homepage(base_url, cache_bust=True)
        cold_results.append(result)
        
        if result["success"]:
            print_success(f"{result['elapsed_ms']:.1f}ms")
        else:
            print_error(f"{result['error']}")
    
    # Wait a moment for cache to stabilize
    time.sleep(1)
    
    print_section("CACHED REQUESTS (After Warmup)")
    print(f"Running {num_requests} requests using cache...\n")
    
    for i in range(num_requests):
        print_info(f"Request {i+1}/{num_requests}...", end=" ")
        result = benchmark_homepage(base_url, cache_bust=False)
        cached_results.append(result)
        
        if result["success"]:
            print_success(f"{result['elapsed_ms']:.1f}ms")
        else:
            print_error(f"{result['error']}")
    
    return cold_results, cached_results

def analyze_results(cold_results: List[Dict], cached_results: List[Dict]) -> None:
    """
    Analyze and display benchmark results.
    
    Args:
        cold_results: List of cold request results
        cached_results: List of cached request results
    """
    print_section("BENCHMARK ANALYSIS")
    
    # Filter successful results
    cold_success = [r for r in cold_results if r["success"]]
    cached_success = [r for r in cached_results if r["success"]]
    
    if not cold_success or not cached_success:
        print_error("Not enough successful requests to analyze")
        return
    
    cold_times = [r["elapsed_ms"] for r in cold_success]
    cached_times = [r["elapsed_ms"] for r in cached_success]
    
    # Calculate statistics
    cold_avg = statistics.mean(cold_times)
    cold_min = min(cold_times)
    cold_max = max(cold_times)
    cold_median = statistics.median(cold_times)
    cold_stdev = statistics.stdev(cold_times) if len(cold_times) > 1 else 0
    
    cached_avg = statistics.mean(cached_times)
    cached_min = min(cached_times)
    cached_max = max(cached_times)
    cached_median = statistics.median(cached_times)
    cached_stdev = statistics.stdev(cached_times) if len(cached_times) > 1 else 0
    
    # Calculate improvement
    improvement_pct = ((cold_avg - cached_avg) / cold_avg * 100) if cold_avg > 0 else 0
    speedup = cold_avg / cached_avg if cached_avg > 0 else 0
    
    # Print cold request stats
    print(f"\n{Colors.BOLD}Cold Requests (Cache Bypass):{Colors.ENDC}")
    print(f"  Average:   {cold_avg:8.1f} ms")
    print(f"  Median:    {cold_median:8.1f} ms")
    print(f"  Min:       {cold_min:8.1f} ms")
    print(f"  Max:       {cold_max:8.1f} ms")
    print(f"  Std Dev:   {cold_stdev:8.1f} ms")
    print(f"  Success:   {len(cold_success)}/{len(cold_results)}")
    
    # Print cached request stats
    print(f"\n{Colors.BOLD}Cached Requests:{Colors.ENDC}")
    print(f"  Average:   {cached_avg:8.1f} ms")
    print(f"  Median:    {cached_median:8.1f} ms")
    print(f"  Min:       {cached_min:8.1f} ms")
    print(f"  Max:       {cached_max:8.1f} ms")
    print(f"  Std Dev:   {cached_stdev:8.1f} ms")
    print(f"  Success:   {len(cached_success)}/{len(cached_results)}")
    
    # Print improvement
    print(f"\n{Colors.BOLD}Performance Improvement:{Colors.ENDC}")
    print(f"  Speedup:           {speedup:.1f}x faster")
    print(f"  Time Saved:        {cold_avg - cached_avg:.1f} ms ({improvement_pct:.1f}%)")
    
    # Print cache effectiveness
    print(f"\n{Colors.BOLD}Cache Effectiveness:{Colors.ENDC}")
    cache_hits = sum(1 for r in cached_success if r.get("cache_status") == "HIT")
    cache_misses = sum(1 for r in cached_success if r.get("cache_status") == "MISS")
    cache_bypasses = sum(1 for r in cached_success if r.get("cache_status") == "BYPASS")
    
    if cache_hits + cache_misses + cache_bypasses > 0:
        hit_rate = (cache_hits / (cache_hits + cache_misses + cache_bypasses)) * 100 if cache_hits + cache_misses + cache_bypasses > 0 else 0
        print(f"  Cache Hits:        {cache_hits}")
        print(f"  Cache Misses:      {cache_misses}")
        print(f"  Cache Bypasses:    {cache_bypasses}")
        print(f"  Hit Rate:          {hit_rate:.1f}%")
    
    # Check for failures
    if any(not r["success"] for r in cold_results):
        print_warning("Some cold requests failed")
    if any(not r["success"] for r in cached_results):
        print_warning("Some cached requests failed")
    
    # Success/failure ratio
    all_success = sum(1 for r in cold_results + cached_results if r["success"])
    all_total = len(cold_results) + len(cached_results)
    print(f"\n{Colors.BOLD}Overall Success Rate:{Colors.ENDC}")
    print(f"  {all_success}/{all_total} requests successful ({all_success/all_total*100:.1f}%)")

def main():
    """Main benchmark execution."""
    parser = argparse.ArgumentParser(
        description="Benchmark homepage performance after optimizations"
    )
    parser.add_argument(
        "--url",
        default="http://localhost:5000",
        help="Base URL of the homepage API (default: http://localhost:5000)"
    )
    parser.add_argument(
        "--requests",
        type=int,
        default=5,
        help="Number of requests to run in each category (default: 5)"
    )
    
    args = parser.parse_args()
    
    print_header("Homepage Performance Benchmark")
    print_info(f"Target URL: {args.url}")
    print_info(f"Requests per category: {args.requests}")
    print_info(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Run benchmarks
    cold_results, cached_results = run_benchmark_suite(args.url, args.requests)
    
    # Analyze results
    analyze_results(cold_results, cached_results)
    
    print_header("Benchmark Complete")

if __name__ == "__main__":
    main()
