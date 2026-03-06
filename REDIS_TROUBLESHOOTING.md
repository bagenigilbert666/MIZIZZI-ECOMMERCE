# Redis Backend Troubleshooting Guide

This guide helps you diagnose and fix issues with your Redis integration.

## Common Issues & Solutions

### Issue 1: ImportError - No module named 'app'

**Symptoms:**
```
✗ Failed to import Redis client: No module named 'app'
```

**Causes:**
- Running from wrong directory
- Python path not set correctly
- Missing `__init__.py` files

**Solutions:**
1. **Run from project root:**
   ```bash
   cd /path/to/MIZIZZI-ECOMMERCE
   python scripts/test_redis_backend.py
   ```

2. **Verify directory structure:**
   ```bash
   # Should all exist
   ls -la backend/app/__init__.py
   ls -la backend/app/cache/__init__.py
   ls -la backend/app/cache/redis_client.py
   ```

3. **If files missing, they may need to be created**

---

### Issue 2: Environment Variables Not Found

**Symptoms:**
```
✗ UPSTASH_REDIS_REST_URL set: NOT SET
✗ UPSTASH_REDIS_REST_TOKEN set: NOT SET
```

**Causes:**
- `.env` file not in backend directory
- `.env` file not loaded by test
- Environment variables not exported

**Solutions:**
1. **Check .env file exists:**
   ```bash
   cat backend/.env
   ```

2. **Verify it contains the credentials:**
   ```bash
   grep "UPSTASH_REDIS" backend/.env
   ```

3. **Export manually in shell:**
   ```bash
   export UPSTASH_REDIS_REST_URL="https://nearby-rabbit-63956.upstash.io"
   export UPSTASH_REDIS_REST_TOKEN="your-token-here"
   ```

4. **Or load from file:**
   ```bash
   # Linux/macOS
   source backend/.env
   python scripts/test_redis_backend.py
   
   # PowerShell
   Get-Content backend/.env | ForEach-Object { 
       if ($_ -and -not $_.StartsWith("#")) {
           $key, $value = $_.Split("=", 2)
           [Environment]::SetEnvironmentVariable($key, $value)
       }
   }
   python scripts/test_redis_backend.py
   ```

---

### Issue 3: PING Command Failed

**Symptoms:**
```
✗ PING command: Connection failed
```

**Causes:**
- Incorrect URL or token
- Network connectivity issue
- Upstash service down
- URL doesn't end with `/`

**Solutions:**
1. **Verify URL format:**
   ```bash
   # Should be exactly like this (with ending slash if using REST API)
   echo $UPSTASH_REDIS_REST_URL
   # Expected: https://nearby-rabbit-63956.upstash.io
   ```

2. **Test connectivity directly:**
   ```bash
   # Test if endpoint is reachable
   curl -i https://nearby-rabbit-63956.upstash.io
   
   # Or with token
   curl -i -H "Authorization: Bearer YOUR-TOKEN" \
     https://nearby-rabbit-63956.upstash.io
   ```

3. **Check token format:**
   - Token should NOT have "Bearer" prefix in .env
   - Token should be the raw string
   - NO spaces or quotes around token

4. **Test from Upstash console:**
   - Go to https://console.upstash.io
   - Open the mizizzi Redis instance
   - Try executing a PING command directly
   - If it works there, issue is with credentials or network

---

### Issue 4: SET Command Failed

**Symptoms:**
```
✗ SET command: Failed to set key
```

**Causes:**
- Bearer token invalid
- Request format incorrect
- Redis instance at quota
- Authentication header missing

**Solutions:**
1. **Verify Redis instance is active:**
   - Check Upstash console
   - Ensure database isn't at capacity

2. **Check token:**
   ```bash
   # Should return full token (not truncated)
   echo $UPSTASH_REDIS_REST_TOKEN | wc -c
   # Should be 80+ characters
   ```

3. **Test with curl:**
   ```bash
   curl -X POST https://nearby-rabbit-63956.upstash.io \
     -H "Authorization: Bearer YOUR-TOKEN" \
     -H "Content-Type: application/json" \
     -d '["SET", "test-key", "test-value"]'
   ```

4. **Check Redis quota:**
   - Go to Upstash console
   - Check "Commands" usage
   - Verify you haven't exceeded limits

---

### Issue 5: Requests Library Not Available

**Symptoms:**
```
ImportError: No module named 'requests'
```

**Causes:**
- requests library not installed
- Running in wrong Python environment

**Solutions:**
1. **Install requests:**
   ```bash
   pip install requests
   ```

2. **If using uv (Python environment manager):**
   ```bash
   uv pip install requests
   ```

3. **Verify installation:**
   ```bash
   python -c "import requests; print(requests.__version__)"
   ```

---

### Issue 6: JSON Parsing Error

**Symptoms:**
```
json.decoder.JSONDecodeError: Expecting value
```

**Causes:**
- Invalid Redis response
- HTTP 4xx/5xx error
- Malformed payload

**Solutions:**
1. **Check HTTP status code:**
   - Look for "HTTP Response" lines in output
   - 400-499: Check request format
   - 500-599: Server error - try later

2. **Verify URL:**
   - Must be exact Redis endpoint
   - Should not include `/` at end for REST API

3. **Check for typos in credentials:**
   - Any extra spaces will cause auth failure
   - Copy-paste from Upstash console if unsure

---

## Diagnostic Steps

### Step 1: Verify Python Installation
```bash
python --version
# Should be 3.8+

python -c "import sys; print(sys.path)"
# Verify backend directory is in path
```

### Step 2: Verify Dependencies
```bash
python -c "import requests; print('requests OK')"
```

### Step 3: Check Backend Structure
```bash
ls -la backend/app/
ls -la backend/app/cache/
ls -la backend/.env
```

### Step 4: Test Environment Variables
```bash
python -c "import os; print('URL:', os.environ.get('UPSTASH_REDIS_REST_URL'))"
python -c "import os; print('TOKEN:', os.environ.get('UPSTASH_REDIS_REST_TOKEN')[:20] + '...' if os.environ.get('UPSTASH_REDIS_REST_TOKEN') else 'NOT SET')"
```

### Step 5: Run Test with Debug Output
```bash
# Add this to your shell to see all requests
PYTHONVERBOSE=2 python scripts/test_redis_backend.py 2>&1 | tee debug.log
```

---

## Checking Upstash Console

1. **Go to:** https://console.upstash.io
2. **Select:** mizizzi (or your database)
3. **Tab:** Queries (or Data Browser)
4. **Test:** Try executing commands directly
   ```
   PING
   SET test:key test:value
   GET test:key
   ```
5. **Check:** If these work in console but not in Python, it's a client-side issue

---

## Checking Flask Backend Integration

Once test passes, verify Flask integration:

```python
# In Flask shell
cd backend
python -c "
from app.cache.redis_client import get_redis_client
client = get_redis_client()
if client:
    print('✓ Redis client available in Flask')
    print('✓ Ping:', client.ping())
else:
    print('✗ Redis client not available')
"
```

---

## Getting Help

If issues persist:

1. **Check logs:**
   ```bash
   tail -f debug.log  # If you enabled debug output
   ```

2. **Verify with curl:**
   ```bash
   curl -v -X POST $UPSTASH_REDIS_REST_URL \
     -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN" \
     -H "Content-Type: application/json" \
     -d '["PING"]'
   ```

3. **Contact Upstash support:**
   - https://upstash.com/docs/redis/overall/support

4. **Check Redis client source:**
   - `backend/app/cache/redis_client.py`
   - Add debug prints to understand what's happening

---

## Advanced Debugging

### Enable Request Logging
Add to the test script before importing redis_client:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Manual API Test
```bash
# Test Redis PING directly
python -c "
import requests
import os

url = os.environ.get('UPSTASH_REDIS_REST_URL')
token = os.environ.get('UPSTASH_REDIS_REST_TOKEN')

response = requests.post(
    url,
    headers={
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    },
    json=['PING']
)

print('Status:', response.status_code)
print('Response:', response.json())
"
```

### Check File Permissions
```bash
# Make sure scripts are readable
chmod +x test_redis.sh
ls -la test_redis.sh  # Should show 'x' permission
```

---

## Performance Monitoring

Once working, monitor cache performance:

```bash
# Check cache hit rate
python -c "
from backend.app.cache.redis_client import get_redis_client
client = get_redis_client()
# Get stats from Redis INFO command
info = client._execute_command('INFO', 'stats')
print(info)
"
```

---

## Still Having Issues?

1. Review the complete setup in `REDIS_INTEGRATION_GUIDE.md`
2. Check `REDIS_QUICK_REFERENCE.md` for command reference
3. Run the test again with verbose output
4. Contact support with the full error log
