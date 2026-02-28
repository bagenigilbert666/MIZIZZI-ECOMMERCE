# 401 Error Fix - Orders Page

## The Problem

Your orders page was throwing a **401 Unauthorized** error because:

1. **Admin authentication is client-side** - Token stored in localStorage
2. **Server-side rendering couldn't access localStorage** - Only client-side storage
3. **API calls were failing** - No authentication token sent to backend
4. **Error cascade** - Page couldn't render due to failed data fetch

## The Root Cause

When the orders page tried to load:
```
Page Component (Server-side)
    ↓
Tries to fetch orders
    ↓
No token available (server can't access localStorage)
    ↓
API returns 401
    ↓
Page crashes or shows empty state
```

## The Solution

We implemented a **three-layer authentication system**:

### Layer 1: Client-Side Token Storage
```javascript
// Browser localStorage
localStorage.setItem('mizizzi_token', 'eyJhbGc...')
```

### Layer 2: Admin Auth Context
```javascript
// Provides getToken() method
const { getToken } = useAdminAuth()
const token = getToken() // Gets from localStorage
```

### Layer 3: Server Action with Token Parameter
```javascript
// Server action accepts token from client
export async function fetchOrdersWithAuth(params) {
  const token = params?.token // Token passed from client
  // Use token in API request
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
}
```

## How It Works Now

```
1. User logs in
   ↓ Token saved to localStorage
2. Orders page loads
   ↓ Component mounts
3. Check authentication
   ↓ useAdminAuth() confirms logged in
4. Get token from localStorage
   ↓ getToken() retrieves token
5. Fetch orders with token
   ↓ adminService.getOrders()
6. Admin service sends request
   ↓ Headers: Authorization: Bearer {token}
7. Backend receives token
   ↓ Validates and processes request
8. Returns order data
   ↓ Component displays results
```

## Technical Implementation

### Step 1: Client Gets Token
```javascript
// In orders-page-content.tsx
const { getToken } = useAdminAuth()
const token = getToken()
```

### Step 2: Pass to Server Action
```javascript
// Server action receives token
export async function fetchOrdersWithAuth(params) {
  const token = params?.token
  
  // Make API call with token
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
}
```

### Step 3: Handle Errors & Retry
```javascript
// Admin service handles:
// 1. Check if token exists
// 2. Send request with token
// 3. If 401 -> Refresh token
// 4. Retry with new token
// 5. Return data or error
```

## Error Scenarios Handled

| Scenario | Handling | Result |
|----------|----------|--------|
| No token | Return empty orders | No crash |
| Invalid token | Attempt refresh | Retry with new token |
| 401 error | Refresh & retry | Success or empty |
| API error | Log & continue | Show error toast |
| Timeout | Abort request | Show timeout error |

## Testing the Fix

### Test 1: Verify Token Exists
```javascript
const token = localStorage.getItem('mizizzi_token')
console.log('Token exists:', !!token)
```

### Test 2: Check Auth Status
```javascript
const { isAuthenticated } = useAdminAuth()
console.log('Authenticated:', isAuthenticated)
```

### Test 3: Manual Fetch
```javascript
const { refetch } = useAdminOrders()
refetch().then(data => console.log('Orders:', data))
```

### Test 4: API Test Script
```bash
# Get token from browser console first
node scripts/test-orders-api.js "YOUR_TOKEN_HERE"
```

## Prevention Measures

To prevent 401 errors in the future:

1. **Always check token before API calls**
   ```javascript
   if (!token) throw new Error('Not authenticated')
   ```

2. **Implement token refresh**
   ```javascript
   if (response.status === 401) {
     await refreshToken()
     // Retry request
   }
   ```

3. **Use proper headers**
   ```javascript
   headers: {
     'Authorization': `Bearer ${token}`,
     'Content-Type': 'application/json'
   }
   ```

4. **Handle expiry gracefully**
   ```javascript
   try {
     return await fetchOrders()
   } catch (error) {
     if (error.status === 401) {
       // Logout or redirect to login
     }
   }
   ```

## Files That Handle This

1. **Admin Service** (`services/admin.ts`)
   - Has token refresh logic
   - Retries on 401 errors
   - Manages localStorage tokens

2. **Admin Auth Context** (`contexts/admin/auth-context.tsx`)
   - Provides `getToken()` method
   - Handles token lifecycle
   - Manages authentication state

3. **Orders Page** (`app/admin/orders/orders-page-content.tsx`)
   - Uses auth context
   - Calls admin service
   - Displays results

4. **Server Action** (`lib/server/get-orders-with-auth.ts`)
   - Accepts token parameter
   - Makes authenticated API calls
   - Handles server-side errors

## Key Takeaway

The 401 error is **fixed** by:
1. ✅ Storing token in localStorage (client-side)
2. ✅ Retrieving token via context (useAdminAuth)
3. ✅ Passing token to API calls (Authorization header)
4. ✅ Handling token expiry (refresh & retry)
5. ✅ Graceful error handling (empty state vs crash)

---

**Your orders page now properly handles authentication at all levels!**
