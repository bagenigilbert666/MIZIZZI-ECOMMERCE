# Quick Reference - MIZIZZI Backend Commands

## ⚡ Local Development - Start Here

### First Time Setup
```bash
# macOS/Linux
./setup-local.sh

# Windows
setup-local.bat

# Manual (all platforms)
cd backend
cp .env.example .env
pip install -r requirements.txt
```

### Run Backend
```bash
cd backend
python -m flask --app wsgi:app run --debug
```
- Available at: `http://localhost:5000`
- Debug mode enabled (hot-reload on file changes)
- 523 endpoints ready to use

### Run Frontend
```bash
cd frontend
pnpm install   # First time only
pnpm dev
```
- Available at: `http://localhost:3000`
- Connects to backend at `http://localhost:5000/api`

---

## 🗄️ Database Commands

### Initialize Database
```bash
python -m flask --app wsgi:app db init
```

### Create Migration (after model changes)
```bash
python -m flask --app wsgi:app db migrate -m "description"
```

### Apply Migrations
```bash
python -m flask --app wsgi:app db upgrade
```

### Rollback Migration
```bash
python -m flask --app wsgi:app db downgrade
```

---

## 🔍 API Testing

### Health Check (verify backend is running)
```bash
curl http://localhost:5000/api/health-check
```

### Get All Products
```bash
curl http://localhost:5000/api/products
```

### Get Trending Products
```bash
curl http://localhost:5000/api/products/trending
```

### Get Homepage Data
```bash
curl http://localhost:5000/api/homepage
```

---

## 🚀 Render Deployment

### Deploy via Render Dashboard
1. Go to Render dashboard
2. Select the MIZIZZI-ECOMMERCE service
3. Click "Deploy" or "Redeploy"
4. Wait ~5 minutes for deployment

### Check Render Logs
```
Render Dashboard → Logs → View logs for errors
```

### Environment Variables (Set in Render Dashboard)
- Copy from `backend/.env.example`
- Add your production secrets
- Optional: Add Upstash credentials for distributed caching

---

## 🔧 Environment Variables

### Local Development (`.env` file)
```bash
FLASK_CONFIG=development
DATABASE_URL=postgresql://...
UPSTASH_REDIS_REST_URL=          # Leave empty for local
UPSTASH_REDIS_REST_TOKEN=        # Leave empty for local
```

### Render Production (Dashboard Settings → Environment)
```bash
FLASK_CONFIG=production
DATABASE_URL=postgresql://...
UPSTASH_REDIS_REST_URL=https://your-upstash.upstash.io    # Optional
UPSTASH_REDIS_REST_TOKEN=your-token                         # Optional
```

---

## 📊 Performance Monitoring

### Check Cache Performance
```bash
# See if caching is working (second request should be much faster)
curl http://localhost:5000/api/homepage  # First: ~100-150ms
curl http://localhost:5000/api/homepage  # Second: <50ms
```

### Monitor Redis (if using Upstash)
- Go to Upstash console: https://console.upstash.com/
- Check memory usage and hit rate
- View operations log for debugging

---

## 🐛 Common Issues & Fixes

### Issue: Backend won't start
```
Error: [Errno 48] Address already in use
Fix: Port 5000 is busy. Either:
  1. Kill process: lsof -ti:5000 | xargs kill
  2. Use different port: --port 5001
```

### Issue: Frontend can't reach backend
```
Error: CORS error or connection refused
Fix: Check NEXT_PUBLIC_API_URL in frontend/.env.local
  NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### Issue: Database connection fails
```
Error: psycopg2.OperationalError
Fix: Check DATABASE_URL in backend/.env
  Should be: postgresql://user:password@host/db
```

### Issue: Homepage takes 95 seconds
```
Error: First load extremely slow
Fix: Likely cold start (all queries run). Second load should be <50ms
  If still slow: Check database health
```

---

## 📁 Project Structure

```
mizizzi-ecommerce/
├── backend/
│   ├── .env                    # Local env vars (don't commit!)
│   ├── .env.example            # Template for env vars
│   ├── wsgi.py                 # Entry point
│   ├── app/
│   │   ├── __init__.py         # App factory
│   │   ├── configuration/      # Config & extensions
│   │   ├── models/             # Database models
│   │   ├── routes/             # API endpoints
│   │   ├── cache/              # Caching utilities
│   │   └── utils/              # Helper functions
│   ├── requirements.txt        # Python dependencies
│   └── migrations/             # Alembic migrations
├── frontend/
│   ├── .env.local              # Frontend env vars
│   ├── app/                    # Next.js app directory
│   ├── components/             # React components
│   ├── package.json
│   └── pnpm-lock.yaml
├── .env                        # Don't use (use backend/.env)
├── .gitignore
├── COMPLETE_FIX_SUMMARY.md     # Overview of all fixes
├── ENVIRONMENT_SETUP_GUIDE.md  # Detailed setup guide
└── setup-local.sh / setup-local.bat  # Auto setup
```

---

## 🎯 Development Workflow

### 1. Start services (in separate terminals)
```bash
# Terminal 1: Backend
cd backend
python -m flask --app wsgi:app run --debug

# Terminal 2: Frontend
cd frontend
pnpm dev

# Terminal 3: (Optional) Database migrations
cd backend
python -m flask --app wsgi:app shell
```

### 2. Make code changes
- Backend changes: Auto-reload on save (debug mode)
- Frontend changes: Auto-reload with HMR
- Database changes: Create migration, apply with `db upgrade`

### 3. Test API changes
```bash
# Quick test
curl http://localhost:5000/api/your-endpoint

# Full test with frontend
Visit http://localhost:3000 in browser
```

### 4. Commit and push
```bash
git add .                    # Don't worry - .env is in .gitignore
git commit -m "Your message"
git push origin main
```

### 5. Deploy to Render
- Code automatically deploys on push to main
- Monitor in Render dashboard
- Check logs for errors

---

## 💡 Pro Tips

1. **Use `pnpm` not `npm`** - It's faster and more reliable
2. **Never commit `.env`** - It's in `.gitignore` for security
3. **Test locally before deploying** - Catches issues early
4. **Monitor Render logs** - First place to check for production issues
5. **Use same database for local and Render** - Easier to debug
6. **Keep dependencies updated** - Regular `pip install -U -r requirements.txt`

---

## 📞 Getting Help

### Backend Issues
- Check `/api/health-check` endpoint
- View logs: `tail -f logs/app.log`
- Check config: `python -c "from app import app; print(app.config)"`

### Frontend Issues
- Check browser DevTools (F12) → Network tab
- Look at React Developer Tools
- Check `.env.local` has correct API URL

### Render Issues
- Check Render dashboard logs (real-time)
- Verify environment variables are set
- Look for "deployment failed" emails

---

**Last Updated**: March 8, 2026
**Status**: Ready for development and production
