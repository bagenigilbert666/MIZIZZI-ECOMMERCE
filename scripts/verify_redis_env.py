#!/usr/bin/env python3
"""Quick verification that Redis .env is properly configured."""
import os
from pathlib import Path

print("Checking Redis .env configuration...\n")

# Find .env
backend_dir = Path(__file__).parent.parent / 'backend'
env_file = backend_dir / '.env'

if not env_file.exists():
    print(f"✗ .env not found at {env_file}")
    exit(1)

print(f"✓ Found .env at {env_file}")

# Read and check variables
with open(env_file) as f:
    content = f.read()

url_in_file = 'UPSTASH_REDIS_REST_URL=' in content
token_in_file = 'UPSTASH_REDIS_REST_TOKEN=' in content

print(f"✓ UPSTASH_REDIS_REST_URL in .env: {url_in_file}")
print(f"✓ UPSTASH_REDIS_REST_TOKEN in .env: {token_in_file}")

if url_in_file and token_in_file:
    print("\n✓ .env looks good! Variables are present.")
    print("\nTo use these in Python:")
    print("  from dotenv import load_dotenv")
    print("  load_dotenv('backend/.env')")
else:
    print("\n✗ Missing one or both variables in .env")
    exit(1)
