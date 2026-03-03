# Environment Variable Verification Checklist

## Pre-Flight Checks (Before Running Dev Server)

- [ ] File exists: `/frontend/.env.local`
- [ ] File contains: `NEXT_PUBLIC_API_URL=https://mizizzi-ecommerce-1.onrender.com`
- [ ] File contains: `NEXT_PUBLIC_BACKEND_URL=https://mizizzi-ecommerce-1.onrender.com`
- [ ] File contains: `NEXT_PUBLIC_WEBSOCKET_URL=wss://mizizzi-ecommerce-1.onrender.com`
- [ ] `.gitignore` includes `.env.local` (do NOT commit this file)
- [ ] `.env.example` exists in `/frontend/` directory

## Local Development Verification

### Step 1: Clear Cache and Restart
```bash
cd frontend
rm -rf .next
npm run dev:turbo  # or pnpm dev:turbo
```

### Step 2: Check Build Output
Look for this in the terminal output:
```
[v0] API_BASE_URL configured as: NEXT_PUBLIC_API_URL: https://mizizzi-ecommerce-1.onrender.com
```

If you see this instead:
```
Export API_API_BASE_URL doesn't exist in target module
```

**Solution**: 
- Check that `frontend/.env.local` exists and is in the right directory
- Ensure no typos in the environment variable names
- Restart your terminal/IDE

### Step 3: Browser Network Verification

1. Open http://localhost:3000 in your browser
2. Open DevTools (F12)
3. Go to Network tab
4. Trigger an API call by navigating to a page with categories/products
5. Look at the request URL:

✅ **Correct:**
```
https://mizizzi-ecommerce-1.onrender.com/api/categories?...
```

❌ **Incorrect (still using localhost):**
```
http://localhost:5000/api/categories?...
```

### Step 4: Browser Console Check

- Open DevTools Console tab (F12 → Console)
- Look for `[v0]` debug messages showing the API URL
- Check for any errors related to API connection
- Note: Clear console cache with right-click → Clear console

## Render Deployment Verification

### Pre-Deployment (Local)

- [ ] `.env.local` is NOT committed to git
- [ ] `.env.example` IS committed to git
- [ ] All server files import `API_BASE_URL` from `../config`
- [ ] No hardcoded API URLs in code (except in config.ts fallback)

### Post-Deployment

1. Go to your Render service dashboard
2. Check Settings → Environment for these variables:
   - [ ] `NEXT_PUBLIC_API_URL` = `https://mizizzi-ecommerce-1.onrender.com`
   - [ ] `NEXT_PUBLIC_BACKEND_URL` = `https://mizizzi-ecommerce-1.onrender.com`
   - [ ] `NEXT_PUBLIC_WEBSOCKET_URL` = `wss://mizizzi-ecommerce-1.onrender.com`

3. Visit your deployed site (e.g., https://your-site.onrender.com)
4. Open DevTools Network tab
5. Verify API calls go to `https://mizizzi-ecommerce-1.onrender.com`

### Troubleshooting Render

If API calls still go to wrong URL:

1. **Option A: Manual Deploy**
   - Click the "..." menu in Render dashboard
   - Select "Manual Deploy"
   - Choose "Deploy latest commit"
   - Wait for deployment to complete

2. **Option B: Hard Refresh**
   - Hard refresh your browser: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
   - Clear all browser cache for the domain
   - Close and reopen browser

3. **Option C: Check Logs**
   - In Render dashboard, check "Logs" tab
   - Look for build-time errors
   - Search for `API_BASE_URL` to see what was configured

## Email (Brevo) Verification

### Backend Brevo Setup

Check that Render has these environment variables set:
- [ ] `BREVO_API_KEY` - Your Brevo API key
- [ ] `BREVO_SENDER_EMAIL` - Email address (must be verified in Brevo)
- [ ] `BREVO_SENDER_NAME` - Display name (e.g., "MIZIZZI")

### Test Email Sending

1. Create a test order on your site
2. Check Render backend logs for:
   ```
   [v0] Email sent successfully to user@example.com
   ```
3. Check your email inbox (and spam folder)
4. Verify sender name shows as "MIZIZZI" or your configured name

### Email Troubleshooting

If emails aren't sending:
1. Check sender email is verified in Brevo dashboard
2. Verify `BREVO_API_KEY` is correct in Render environment
3. Check Render backend logs for error messages
4. Test Brevo API directly from Brevo dashboard

## Files Created/Modified

### New Files
- ✅ `frontend/.env.local` - Your actual configuration
- ✅ `frontend/.env.example` - Template for developers
- ✅ `FRONTEND_ENV_CONFIGURATION.md` - Detailed guide

### Modified Files
- ✅ `frontend/lib/config.ts` - Added debug logging

### Files That Reference This Configuration
- `frontend/lib/server/get-categories.ts`
- `frontend/lib/server/get-trending-products.ts`
- `frontend/lib/server/get-top-picks.ts`
- `frontend/lib/server/get-new-arrivals.ts`
- `frontend/lib/server/get-luxury-products.ts`
- `frontend/lib/server/get-daily-finds.ts`
- `frontend/lib/server/get-carousel-data.ts`
- `frontend/lib/server/get-all-products.ts`
- `frontend/lib/server/get-flash-sale-products.ts`
- `frontend/lib/server/get-footer-settings.ts`

All of these now import from `frontend/lib/config.ts` instead of having hardcoded URLs.

## Quick Reference

**Local Dev:**
```bash
cd frontend
rm -rf .next
npm run dev:turbo
```

**After updating `.env.local`:**
1. Restart dev server (Ctrl+C then run again)
2. Hard refresh browser
3. Clear browser cache

**Render Deployment:**
1. Ensure env vars set in Render dashboard
2. Push changes to GitHub
3. Render auto-deploys (or manually deploy)
4. Hard refresh browser after deployment

**Debug API URL:**
- Check Network tab in DevTools
- Look for actual request URLs
- Should match what's in `NEXT_PUBLIC_API_URL` or Render env var

## Success Indicators

✅ **You'll know it's working when:**
- API calls go to `https://mizizzi-ecommerce-1.onrender.com`
- No `localhost:5000` errors in console
- Category/product pages load with data
- Orders are created successfully
- Order confirmation emails are received

If you still have issues after following this checklist, the problem is likely:
1. `.env.local` file missing or in wrong directory
2. Env variables not set correctly in Render dashboard
3. Browser cache not cleared after changes
4. Backend service not running on Render
