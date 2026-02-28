# Orders Page - Quick Reference Guide

## Common Issues & Solutions

### Issue: 401 Unauthorized Error

**Symptoms:**
- "API returned status 401" in console
- Empty orders list
- Toast shows "Authentication failed"

**Quick Fixes:**
1. **Logout and Login Again**
   ```javascript
   // In browser console
   adminService.logout()
   // Then navigate to /admin/login
   ```

2. **Check Token Expiry**
   ```javascript
   const token = localStorage.getItem('mizizzi_token')
   console.log(token)
   ```

3. **Force Token Refresh**
   ```javascript
   const { refreshToken } = useAdminAuth()
   refreshToken()
   ```

4. **Clear All Tokens**
   ```javascript
   localStorage.removeItem('mizizzi_token')
   localStorage.removeItem('admin_token')
   localStorage.removeItem('mizizzi_refresh_token')
   localStorage.removeItem('admin_refresh_token')
   // Then reload page and login again
   ```

---

### Issue: Orders List Empty or Blank

**Symptoms:**
- "No orders found" message appears
- Statistics show 0 total orders
- But should have orders in database

**Quick Fixes:**
1. **Check API Response**
   ```bash
   # Get your admin token first
   TOKEN=$(node -e "console.log(localStorage.getItem('mizizzi_token'))")
   
   # Test API endpoint
   node scripts/test-orders-api.js "$TOKEN"
   ```

2. **Verify Database**
   - Connect to backend database
   - Check if orders table has data
   - Verify order status values

3. **Try Manual Refresh**
   - Click the refresh button in UI
   - Check network tab for API call
   - Review response payload

4. **Check Pagination**
   - Verify `per_page` parameter (default: 20)
   - Check if orders are on other pages
   - Look at pagination totals

---

### Issue: Loading Spinner Never Stops

**Symptoms:**
- Spinner keeps spinning
- No data or error appears
- Page seems frozen

**Quick Fixes:**
1. **Check Network Tab**
   - Open DevTools → Network tab
   - Look for `/api/admin/orders` request
   - Check if request completed or timed out

2. **Clear Cache**
   ```javascript
   // Hard refresh
   Ctrl+Shift+R (Windows)
   Cmd+Shift+R (Mac)
   ```

3. **Check Server Status**
   ```bash
   # Test if backend is responsive
   curl -I https://mizizzi-ecommerce-1.onrender.com/api/health
   ```

4. **Increase Timeout**
   - Edit `lib/server/get-orders-with-auth.ts`
   - Change timeout from 15000 to 30000 ms
   - Reload and try again

---

### Issue: Search or Filter Not Working

**Symptoms:**
- Search box doesn't filter orders
- Status tabs don't change display
- Applied filters show no results

**Quick Fixes:**
1. **Try Manual Refresh**
   - Click refresh button
   - Wait for data to reload
   - Then apply filter

2. **Check Console Logs**
   ```javascript
   // Filter console to show v0 logs only
   console.log("Filter active")
   ```

3. **Status Tab Issues**
   - Status filtering is client-side
   - Should filter immediately
   - If not working, reload page

4. **Search Issues**
   - Search is sent to backend
   - Verify backend implements search
   - Try common search terms

---

### Issue: Cannot Navigate to Order Details

**Symptoms:**
- Clicking "View Details" does nothing
- Page doesn't navigate
- Error appears in console

**Quick Fixes:**
1. **Check Order ID**
   ```javascript
   // Verify order has valid ID
   console.log(order.id)
   ```

2. **Test Navigation**
   ```javascript
   // Try manual navigation
   router.push('/admin/orders/1')
   ```

3. **Check Route Handler**
   - Verify `/admin/orders/[id]/page.tsx` exists
   - Check if it can fetch single order

---

## Debug Commands Cheat Sheet

```javascript
// Check authentication status
const { isAuthenticated } = useAdminAuth()

// Get current token
const token = localStorage.getItem('mizizzi_token')

// Get token from context
const { getToken } = useAdminAuth()
getToken()

// Manual token refresh
adminService.refreshToken()

// Fetch orders directly
adminService.getOrders({ page: 1, per_page: 20 })

// Check admin auth
const { user, isAdmin } = useAdminAuth()

// View all stored items
Object.entries(localStorage)
  .filter(([k]) => k.includes('admin') || k.includes('mizizzi'))
  .forEach(([k, v]) => console.log(k, v.substring(0, 30) + '...'))
```

---

## Environment Variables Checklist

Before deployment, verify:

```bash
# In .env.local
NEXT_PUBLIC_API_URL=https://mizizzi-ecommerce-1.onrender.com
NEXT_PUBLIC_BACKEND_URL=https://mizizzi-ecommerce-1.onrender.com

# Optional for backend
ADMIN_API_TOKEN=your_token_here
```

---

## Testing the Orders API

**Quick Test:**
```bash
# Ensure you have NODE_OPTIONS set correctly if needed
node scripts/test-orders-api.js "YOUR_ADMIN_TOKEN_HERE"
```

**Expected Output:**
```
[Test] Testing Orders API at https://mizizzi-ecommerce-1.onrender.com/api/admin/orders

[Request] Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
  Content-Type: application/json

[Response] Status: 200 OK
[Response] Headers:
  content-type: application/json

[Success] Orders retrieved successfully!
[Data] Items count: 5
[Data] Total items: 5
[Data] Current page: 1
[Data] Total pages: 1
```

---

## Performance Tips

1. **Reduce Page Size**
   - Change `per_page` from 20 to 10
   - Faster initial load

2. **Cache More Aggressively**
   - Edit `revalidate` from 30 to 60 seconds
   - Fewer API calls

3. **Disable Auto-Refresh**
   - Comment out auto-fetch useEffect
   - Only fetch on user action

4. **Optimize Search**
   - Use debouncing on search input
   - Reduce API calls during typing

---

## Monitoring

**Check Logs:**
- Browser Console: `[v0]` prefixed messages
- Network Tab: API requests/responses
- Backend Logs: Error messages
- Database Logs: Query issues

**Key Metrics:**
- API response time
- Success/error rate
- Token refresh frequency
- Average orders per page
