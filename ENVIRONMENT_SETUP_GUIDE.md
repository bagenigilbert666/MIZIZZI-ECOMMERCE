# MIZIZZI E-Commerce Platform - Development & Deployment Guide

## Quick Start - Local Development (Localhost)

### Prerequisites
- Python 3.8+
- pip or poetry
- PostgreSQL (or use the Neon connection string provided)
- Node.js 16+ (for frontend)

### Backend Setup (localhost:5000)

1. **Clone and navigate to backend directory**
```bash
cd backend
```

2. **Copy environment template**
```bash
cp .env.example .env
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Run the backend**
```bash
python -m flask --app wsgi:app run --debug
```

The backend will start on `http://localhost:5000` with:
- ✅ All 523 endpoints available
- ✅ In-memory caching (no Redis needed locally)
- ✅ Database: Connected to Neon PostgreSQL
- ✅ Rate limiting: Memory-based (memory://)
- ✅ Debug mode: Enabled for hot-reload

### Frontend Setup (localhost:3000)

1. **Navigate to frontend directory** (one level up)
```bash
cd ..
cd frontend  # or wherever your Next.js app is
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Configure backend URL in .env.local**
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

4. **Run the frontend**
```bash
pnpm dev
```

Frontend will be available at `http://localhost:3000`

---

## Render Production Deployment

### Backend Environment Setup

On Render, the `.env` file is set via the **Environment** tab in Render dashboard:

1. **Copy all variables from `.env.example`**
2. **For Render, add Upstash Redis credentials** (optional but recommended for caching):
   - Get from https://console.upstash.com/
   - Set `UPSTASH_REDIS_REST_URL`
   - Set `UPSTASH_REDIS_REST_TOKEN`

3. **Database URL** (already configured - uses Neon PostgreSQL)
   - `DATABASE_URL` is pre-set
   - Will use the same database as local development

4. **Important: DO NOT use REDIS_URL on Render**
   - Render provides `REDIS_URL` as traditional Redis (tcp://)
   - Our app uses Upstash REST API instead
   - Leave `REDIS_URL` unused; use Upstash variables above

### Backend Deployment on Render

1. **Build Command**
```
pip install -r requirements.txt
```

2. **Start Command**
```
gunicorn wsgi:app --bind 0.0.0.0:$PORT --workers 2
```

3. **Python Version**: 3.9+ recommended

The backend will deploy to a URL like:
```
https://mizizzi-ecommerce-1.onrender.com
```

---

## Architecture - Why This Works Both Locally and on Render

### Database (Shared)
- **Neon PostgreSQL** is cloud-hosted
- Works on both localhost and Render
- Connection: `DATABASE_URL` env variable

### Caching Strategy
- **Local (localhost)**: In-memory caching (`SimpleCache`)
  - No Redis needed
  - Respects cache TTLs
  - Resets on app restart
  
- **Render**: Upstash REST API (if configured)
  - If Upstash credentials provided: Uses distributed cache
  - If not provided: Falls back to in-memory
  - Rate limiter uses memory:// fallback

### API Contract
- All 523 endpoints work identically on both platforms
- Frontend communicates via HTTP to `/api/*` endpoints
- CORS configured for both `localhost:3000` and production URL

---

## Troubleshooting

### Local Backend Starts But Frontend Can't Connect

**Problem**: Frontend gets CORS error connecting to `http://localhost:5000`

**Solution**:
1. Verify backend is running on `http://localhost:5000`
2. Check `NEXT_PUBLIC_API_URL=http://localhost:5000/api` in frontend `.env.local`
3. Backend CORS already includes `http://localhost:3000` - should work
4. If still failing: backend may have crashed during init

### Backend Won't Start Locally

**Problem**: "Redis connection refused" or similar errors

**Solution**: 
- **Check**: Redis is NOT required locally
- The app should gracefully use in-memory cache
- If getting errors, check `.env` file has `UPSTASH_REDIS_REST_URL=` (empty/blank)
- Run with `python -m flask --app wsgi:app run --debug` to see full error

### Homepage Takes 95+ Seconds to Load

**Problem**: First load is very slow, subsequent loads are fast

**Solution**: 
- Normal on first request (cold start of aggregation)
- Our caching fixes mean 2nd+ requests should be <50ms
- Check `/api/health-check` endpoint works first
- If extremely slow every time: database query issue, not caching

---

## Environment Variables - Complete Reference

| Variable | Local | Render | Purpose |
|----------|-------|--------|---------|
| `FLASK_CONFIG` | `development` | `production` | Flask environment |
| `DATABASE_URL` | Neon URL | Same | PostgreSQL connection |
| `UPSTASH_REDIS_REST_URL` | (empty) | Your Upstash URL | Optional distributed cache |
| `UPSTASH_REDIS_REST_TOKEN` | (empty) | Your Upstash token | Optional distributed cache |
| `GOOGLE_CLIENT_ID` | Yes | Yes | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Yes | Yes | Google OAuth |
| `PESAPAL_CONSUMER_KEY` | Optional | Yes | Payment gateway |
| `JWT_SECRET_KEY` | Dev key | Production key | JWT signing |
| `SECRET_KEY` | Dev key | Production key | Flask app secret |

---

## Performance Notes

### Caching Hierarchy (Local)
1. **Top-level homepage cache** (180s TTL) - fastest
2. **Section-level cache** (60s TTL per section)
3. **Database queries** (indexed columns)

### Caching Hierarchy (Render with Upstash)
1. **Top-level homepage cache** (Upstash, 180s TTL)
2. **Section caches** (Upstash, 60s TTL)
3. **Database queries** (falls back if Upstash times out)

### Cache Timeout Strategy
- **Read operations**: 500ms timeout (fail fast)
- **Write operations**: 2000ms timeout (allow JSON serialization)
- **Fallback**: In-memory cache if primary times out

---

## Next Steps

1. **Local Development**: Follow "Backend Setup" + "Frontend Setup" above
2. **Test Thoroughly**: Verify all endpoints work
3. **Render Deployment**: Push code, set env vars in Render dashboard, deploy
4. **Monitor**: Check Render logs for any startup issues

For production optimization, consider:
- Adding Upstash Redis for distributed caching
- Using Cloudinary for image uploads
- Setting up email forwarding (Brevo)
- Configuring Meilisearch for search
