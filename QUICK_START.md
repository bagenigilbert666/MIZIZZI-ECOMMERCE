# Quick Start Guide - Environment Variables Fixed

## TL;DR - What Was Fixed

✅ Created `/frontend/.env.local` with API configuration  
✅ Updated `/frontend/lib/config.ts` with debug logging  
✅ All server components now import from centralized config  
✅ Ready for local dev and Render production

## What To Do Right Now

### 1. Start Local Development (1 minute)

```bash
cd frontend
rm -rf .next
npm run dev:turbo
```

**Expected output:**
```
[v0] API_BASE_URL configured as: NEXT_PUBLIC_API_URL: https://mizizzi-ecommerce-1.onrender.com
```

### 2. Verify It Works (2 minutes)

1. Open http://localhost:3000 in browser
2. Press F12 to open DevTools
3. Go to Network tab
4. Click on a product or category
5. Look at the API request URL - should be:
   ```
   https://mizizzi-ecommerce-1.onrender.com/api/...
   ```

### 3. For Render Production (5 minutes)

```bash
git add frontend/.env.local frontend/.env.example
git commit -m "Add frontend environment configuration"
git push
```

Render will auto-deploy. Done!

## If Something Goes Wrong

### Still seeing localhost:5000 errors?

```bash
# 1. Hard refresh browser
Ctrl+Shift+R  # Windows/Linux
Cmd+Shift+R   # Mac

# 2. Verify .env.local exists
ls -la frontend/.env.local

# 3. Restart dev server
# Kill current dev server (Ctrl+C)
# Then run: npm run dev:turbo
```

### Render still using old config?

1. Go to Render dashboard
2. Click "..." → "Manual Deploy"
3. Click "Deploy latest commit"
4. Wait for deployment (check Logs tab)
5. Hard refresh browser: `Ctrl+Shift+R`

## Files Created

```
frontend/
├── .env.local              ← NEW: Your API configuration
├── .env.example            ← NEW: Template for developers
└── lib/
    └── config.ts           ← UPDATED: Added debug logging

Documentation/
├── ENV_FIX_SUMMARY.md      ← Overview of all changes
├── FRONTEND_ENV_CONFIGURATION.md  ← Detailed guide
├── ENV_VERIFICATION_CHECKLIST.md  ← Step-by-step verification
└── BREVO_RENDER_FIX_GUIDE.md       ← Email configuration
```

## What's Happening

```
Your Code
    ↓
frontend/.env.local (API_URL loaded)
    ↓
frontend/lib/config.ts (API_BASE_URL exported)
    ↓
lib/server/*.ts files (all import from config)
    ↓
API calls to: https://mizizzi-ecommerce-1.onrender.com
    ↓
Backend responds
    ↓
Data displayed
```

## Email Integration

Brevo emails should now work because:
- ✅ Frontend connects to backend (this fix)
- ✅ Backend can process orders
- ✅ Brevo credentials configured (previous fix)
- ✅ Emails send on order confirmation

## Checklist

- [ ] `.env.local` exists in `frontend/` directory
- [ ] Ran `npm run dev:turbo` successfully
- [ ] No errors about `API_API_BASE_URL`
- [ ] Browser shows API calls to Render URL
- [ ] Categories/products load on homepage
- [ ] Test order can be created
- [ ] Test order confirmation email received

## Need More Details?

- **Full guide:** See `FRONTEND_ENV_CONFIGURATION.md`
- **Step-by-step verification:** See `ENV_VERIFICATION_CHECKLIST.md`
- **Email setup:** See `BREVO_RENDER_FIX_GUIDE.md`
- **Complete overview:** See `ENV_FIX_SUMMARY.md`

## Support

If you still have issues:

1. **Check the documentation files** - They have comprehensive troubleshooting
2. **Clear everything:**
   ```bash
   cd frontend
   rm -rf .next node_modules
   npm install
   npm run dev:turbo
   ```
3. **Restart your machine** - Sometimes helps with env var caching

---

**You're all set!** Your environment variables are now properly configured for both local development and Render production deployment. 🚀
