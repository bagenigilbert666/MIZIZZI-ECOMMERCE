# Orders Page - Server-Side Rendering Implementation

## Overview

The orders management page has been updated to properly handle authentication and server-side rendering with the following improvements:

### Key Changes

1. **Server Action for Data Fetching** (`lib/server/get-orders-with-auth.ts`)
   - Accepts authentication token from client
   - Handles API requests with proper headers
   - Returns structured OrdersResponse with pagination
   - Includes error handling and graceful degradation

2. **Client Component** (`app/admin/orders/orders-page-content.tsx`)
   - Uses client-side authentication (localStorage)
   - Fetches orders via admin service which handles token refresh
   - Displays loading states during API calls
   - Shows error messages when authentication fails

3. **Custom Hook** (`hooks/use-admin-orders.ts`)
   - Provides reusable hook for fetching orders
   - Manages loading, error, and data states
   - Integrates with admin auth context
   - Supports auto-refetch and manual refresh

## Authentication Flow

```
User Login (localStorage)
         ↓
Admin Auth Context (getToken)
         ↓
Admin Service (getOrders)
         ↓
Backend API (/api/admin/orders)
         ↓
Token Refresh (if 401)
         ↓
Retry Request
         ↓
Return Data to Component
```

## Error Handling

The implementation includes several layers of error handling:

1. **Token Validation**: Check if token exists before API call
2. **Token Refresh**: If 401 response, attempt token refresh
3. **Retry Logic**: After refresh, retry the request
4. **Graceful Degradation**: Return empty orders on failure instead of breaking UI
5. **User Feedback**: Toast notifications for auth and API errors

## Environment Variables

Required environment variables:

```bash
NEXT_PUBLIC_API_URL=https://mizizzi-ecommerce-1.onrender.com
NEXT_PUBLIC_BACKEND_URL=https://mizizzi-ecommerce-1.onrender.com
```

## Debugging

### Check Token Status
```javascript
// In browser console
localStorage.getItem('mizizzi_token')
localStorage.getItem('admin_token')
```

### Test API Endpoint
```bash
# Using the test script
node scripts/test-orders-api.js "YOUR_TOKEN_HERE"
```

### Enable Debug Logs
All API calls include `[v0]` prefixed console logs:
- `[v0] fetchOrdersWithAuth: ...` - Server action logs
- `[v0] getOrders: ...` - Admin service logs

## Troubleshooting

### 401 Unauthorized Error
**Cause**: Invalid or expired token
**Solution**: 
1. Log out and log back in
2. Check token expiry time
3. Verify token refresh endpoint is working

### Empty Orders List
**Cause**: Could be:
- No orders in database
- API filter issue
- Authentication timeout
**Solution**:
1. Check server logs for API errors
2. Verify database has order records
3. Test API directly with curl or Postman

### Loading State Never Ends
**Cause**: API request timeout or stalled response
**Solution**:
1. Check network tab in browser DevTools
2. Verify API server is running
3. Check for CORS issues
4. Review server error logs

## Performance Considerations

- Orders are cached with 30-second revalidation
- Pagination supports up to 20 items per page
- Search and filters are client-side when status filter fails
- Token refresh is debounced to prevent multiple simultaneous refreshes

## Future Improvements

1. **Optimistic Updates**: Show pending changes while API responds
2. **Offline Support**: Cache orders locally for offline access
3. **Real-time Updates**: WebSocket integration for live order updates
4. **Advanced Filters**: Server-side filtering for status, date range, amount
5. **Export**: CSV/PDF export functionality for orders
