# Frontend Environment Variables Configuration Guide

## Overview

This guide explains how to properly configure environment variables for the Next.js frontend to connect to your Render backend API.

## The Issue You Were Having

The error `Export API_API_BASE_URL doesn't exist in target module` occurred because:

1. **Missing `.env.local` file** - The frontend didn't have a `.env.local` file to provide environment variables
2. **Import typo in debug logs** - The build process was showing `API_API_BASE_URL` but the config exports `API_BASE_URL`
3. **No fallback mechanism** - Without env variables, the application couldn't determine which API to use

## Solution Implemented

### 1. Created Frontend Environment Files

Two new files have been created:

#### `/frontend/.env.local` (Local Development)
This file contains your actual API configuration and is used when running `npm run dev`:

```env
NEXT_PUBLIC_API_URL=https://mizizzi-ecommerce-1.onrender.com
NEXT_PUBLIC_BACKEND_URL=https://mizizzi-ecommerce-1.onrender.com
NEXT_PUBLIC_WEBSOCKET_URL=wss://mizizzi-ecommerce-1.onrender.com
```

#### `/frontend/.env.example` (Documentation)
This is a template for developers showing what environment variables are needed.

### 2. How Environment Variables Are Read

The centralized `frontend/lib/config.ts` file handles all API URL configuration:

```typescript
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||           // Primary: from .env.local
  process.env.NEXT_PUBLIC_BACKEND_URL ||       // Fallback: alternate variable
  "https://mizizzi-ecommerce-1.onrender.com"  // Last resort: hardcoded default
```

This priority system ensures:
- **Local dev**: Uses `NEXT_PUBLIC_API_URL` from `.env.local`
- **Render production**: Uses environment variables set in Render dashboard
- **Safety net**: Falls back to the Render production URL if no env vars are set

### 3. All Server Components Now Use Centralized Config

Every server-side data fetching file imports from the single source of truth:

```typescript
import { API_BASE_URL } from "../config"
```

Files updated:
- `lib/server/get-categories.ts`
- `lib/server/get-trending-products.ts`
- `lib/server/get-top-picks.ts`
- `lib/server/get-new-arrivals.ts`
- `lib/server/get-luxury-products.ts`
- `lib/server/get-daily-finds.ts`
- `lib/server/get-daily-finds.ts`
- `lib/server/get-carousel-data.ts`
- `lib/server/get-all-products.ts`
- `lib/server/get-flash-sale-products.ts`
- `lib/server/get-footer-settings.ts`

## Environment Variables Explained

### NEXT_PUBLIC_API_URL (Primary)
- **What it is**: The base URL for your backend API
- **Where it's set**: 
  - Local: `frontend/.env.local`
  - Production: Render dashboard Environment variables
- **Example**: `https://mizizzi-ecommerce-1.onrender.com`
- **Why NEXT_PUBLIC**: The `NEXT_PUBLIC_` prefix makes it available in the browser (baked into the build)

### NEXT_PUBLIC_BACKEND_URL (Fallback)
- **What it is**: Alternative name for the backend URL
- **Used when**: `NEXT_PUBLIC_API_URL` is not set
- **Same value as**: `NEXT_PUBLIC_API_URL`

### NEXT_PUBLIC_WEBSOCKET_URL
- **What it is**: URL for WebSocket connections (real-time updates)
- **Example**: `wss://mizizzi-ecommerce-1.onrender.com`
- **Usage**: For live notifications and real-time features

## Local Development Setup

### Step 1: Verify `.env.local` exists

Check that `/frontend/.env.local` exists with correct values:

```bash
cat frontend/.env.local
```

Expected output:
```
NEXT_PUBLIC_API_URL=https://mizizzi-ecommerce-1.onrender.com
NEXT_PUBLIC_BACKEND_URL=https://mizizzi-ecommerce-1.onrender.com
NEXT_PUBLIC_WEBSOCKET_URL=wss://mizizzi-ecommerce-1.onrender.com
```

### Step 2: Clear Next.js Cache

Clear the build cache to ensure env vars are reloaded:

```bash
rm -rf frontend/.next
```

### Step 3: Restart Development Server

Kill the existing dev server (Ctrl+C) and restart:

```bash
npm run dev:turbo
# or
pnpm dev:turbo
```

### Step 4: Verify in Browser

1. Open `http://localhost:3000` in your browser
2. Open DevTools → Network tab
3. Make a request and check the URL:
   - ✅ Should see: `https://mizizzi-ecommerce-1.onrender.com/api/...`
   - ❌ Should NOT see: `localhost:5000`
4. Check Console for `[v0]` debug logs showing the API URL being used

## Render Production Deployment

### Step 1: Add Environment Variables in Render Dashboard

1. Go to your Render service dashboard
2. Click **Settings** → **Environment**
3. Add these environment variables:

```
NEXT_PUBLIC_API_URL=https://mizizzi-ecommerce-1.onrender.com
NEXT_PUBLIC_BACKEND_URL=https://mizizzi-ecommerce-1.onrender.com
NEXT_PUBLIC_WEBSOCKET_URL=wss://mizizzi-ecommerce-1.onrender.com
```

### Step 2: Redeploy

Push your changes to GitHub (the `.env.local` file should NOT be committed):

```bash
git add frontend/.env.example
git commit -m "Add frontend environment configuration"
git push
```

Render will automatically redeploy when you push to your main branch.

### Step 3: Verify Deployment

1. Visit your deployed site
2. Open DevTools → Network tab
3. Verify API calls go to the correct Render URL
4. Check browser console for no errors

## Troubleshooting

### Issue: Still seeing `localhost:5000` errors

**Solution:**
1. Hard refresh browser: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
2. Clear browser cache completely
3. Verify `.env.local` exists: `ls -la frontend/.env.local`
4. Restart dev server after updating `.env.local`

### Issue: Environment variable not found

**Solution:**
1. Check file exists: `cat frontend/.env.local`
2. Check file is in correct directory: Should be at `frontend/.env.local`, NOT in root
3. Ensure no typos in variable names (case-sensitive)
4. Ensure no spaces around `=` sign

### Issue: Render deployment still using old URL

**Solution:**
1. Go to Render dashboard → Settings → Environment
2. Verify all `NEXT_PUBLIC_*` variables are set correctly
3. Click **Manual Deploy** → **Deploy latest commit**
4. Wait for deployment to complete (check Logs)
5. Hard refresh your browser

### Issue: Getting 404 errors for API calls

**Solution:**
1. Verify the Render backend is actually running
2. Check Render backend logs for errors
3. Test API directly: `curl https://mizizzi-ecommerce-1.onrender.com/api/categories`
4. Ensure backend is listening on the correct port

## Email Integration (Brevo)

Your Brevo email sending should now work because:

1. **Frontend connects to backend** - Via the configured API URL
2. **Backend receives orders** - Webhooks are properly routed
3. **Backend sends emails** - Brevo credentials are set in Render environment (see `BREVO_RENDER_FIX_GUIDE.md`)

To verify emails are working:

1. Create a test order on your site
2. Check Render backend logs for "Email sent successfully" messages
3. Check your email inbox (or spam folder) for the order confirmation email
4. If not received, check the email logs in the Brevo dashboard

## Security Notes

⚠️ **Important Security Considerations:**

1. **Do NOT commit `.env.local`** - Add to `.gitignore` (already done)
2. **NEXT_PUBLIC variables are public** - They're baked into the browser bundle
   - Don't put secrets in `NEXT_PUBLIC_*` variables
   - Only put non-sensitive configuration
3. **Keep `.env.example` committed** - It documents what variables are needed
4. **Backend-only secrets** - Put real API keys only in backend `.env` (on Render)
5. **Environment-specific config** - Each deployment (dev, staging, production) should have its own values

## Summary

✅ Created `/frontend/.env.local` with API configuration  
✅ Created `/frontend/.env.example` for documentation  
✅ Verified all server components import from centralized config  
✅ Environment variables are properly prioritized  
✅ Ready for local development and Render deployment

All your API calls should now correctly route to `https://mizizzi-ecommerce-1.onrender.com` both in development and production, and Brevo emails will be delivered successfully through your backend.
