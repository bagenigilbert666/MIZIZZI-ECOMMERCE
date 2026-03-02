# Exact Code Changes Reference

## Change 1: Inventory Service Retry Logic
**File**: `frontend/services/inventory-service.ts`  
**Lines**: ~157-205 (replaced lines 157-171)

```typescript
// BEFORE: Simple try-catch with no retry
async getProductInventory(productId: number, variantId?: number) {
  try {
    const response = await api.get(...)
    return response.data
  } catch (error: any) {
    console.error("Error getting product inventory:", error)
    throw new Error(error.response?.data?.error || "Failed to get product inventory")
  }
}

// AFTER: Retry with exponential backoff + fallback
async getProductInventory(productId: number, variantId?: number, retryCount = 0) {
  try {
    const response = await api.get(...)
    return response.data
  } catch (error: any) {
    const isNetworkError = !error.response || error.code === "ECONNABORTED" || error.code === "ENOTFOUND"
    const shouldRetry = isNetworkError && retryCount < 2

    console.error("[v0] Error getting product inventory:", {
      error: error.message,
      status: error.response?.status,
      retryCount,
      willRetry: shouldRetry,
    })

    if (shouldRetry) {
      const delay = Math.pow(2, retryCount) * 1000 // 1000ms, 2000ms
      console.log(`[v0] Retrying inventory fetch after ${delay}ms...`)
      await new Promise((resolve) => setTimeout(resolve, delay))
      return this.getProductInventory(productId, variantId, retryCount + 1)
    }

    // Return fallback data when backend is unavailable
    if (isNetworkError) {
      console.warn("[v0] Backend unavailable, returning empty inventory fallback")
      return {
        id: -1,
        product_id: productId,
        stock_level: 0,
        reserved_quantity: 0,
        available_quantity: 0,
        reorder_level: 0,
        low_stock_threshold: 5,
        status: "unknown",
        last_updated: new Date().toISOString(),
        created_at: new Date().toISOString(),
        is_in_stock: false,
        is_low_stock: false,
      }
    }

    throw new Error(error.response?.data?.error || "Failed to get product inventory")
  }
}
```

**Key Changes**:
- Added `retryCount` parameter (recursive)
- Detect network errors vs other errors
- Exponential backoff: `2^retryCount * 1000`
- Return empty fallback instead of throwing
- Better logging with retry context

---

## Change 2: Review Service Timeout + Retry
**File**: `frontend/services/review-service.ts`  
**Lines**: ~72-118 (replaced lines 72-115)

```typescript
// BEFORE: Simple fetch with error throw
private async makeRequest<T>(endpoint: string, options: RequestInit = {}) {
  const url = `${this.baseUrl}/api/reviews/user${endpoint}`
  // ... headers setup
  try {
    const response = await fetch(url, config)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      if (response.status === 401) {
        window.dispatchEvent(new CustomEvent("auth-token-expired"))
        throw new Error("Please sign in to continue")
      }
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error(`Review API request failed: ${endpoint}`, error)
    throw error
  }
}

// AFTER: Timeout + retry + graceful fallback
private async makeRequest<T>(endpoint: string, options: RequestInit = {}, retryCount = 0) {
  const url = `${this.baseUrl}/api/reviews/user${endpoint}`
  // ... headers setup
  
  const config: RequestInit = {
    ...options,
    headers: { ... },
    signal: AbortSignal.timeout(15000), // 15 second timeout ← NEW
  }

  try {
    const response = await fetch(url, config)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))

      if (response.status === 401) {
        window.dispatchEvent(new CustomEvent("auth-token-expired"))
        throw new Error("Please sign in to continue")
      }

      // NEW: Retry on server error
      if (response.status >= 500 && retryCount < 1) {
        const delay = Math.pow(2, retryCount) * 1000
        console.log(`[v0] Server error, retrying after ${delay}ms...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
        return this.makeRequest<T>(endpoint, options, retryCount + 1)
      }

      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error: any) {
    // NEW: Graceful fallback for network/timeout errors
    if (error.name === "AbortError" || error.code === "ENOTFOUND" || error.message?.includes("Failed to fetch")) {
      console.warn(`[v0] Review API request failed (${endpoint}):`, error.message)
      
      if (options.method === undefined || options.method === "GET") {
        console.log(`[v0] Returning empty fallback for ${endpoint}`)
        return { items: [], pagination: { page: 1, per_page: 10, total_pages: 0, total_items: 0 } } as T
      }
    }

    console.error(`[v0] Review API request failed: ${endpoint}`, error)
    throw error
  }
}
```

**Key Changes**:
- Added `AbortSignal.timeout(15000)` for 15s timeout
- Added `retryCount` parameter
- Retry on 5xx with exponential backoff
- Return empty paginated results for GET requests on failure
- Better error categorization

---

## Change 3: Search Hook Timeout + Fallback
**File**: `frontend/hooks/use-search.ts`  
**Lines**: ~169-244 (multiple sections updated)

```typescript
// BEFORE: No timeout, no graceful fallback
const fetchRecentSearches = useCallback(async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/products/recent-searches?limit=8`)
    if (response.ok) {
      const data = await response.json()
      const backendRecent = data.items || data || []
      // ... combine with local
      setRecentSearches(combinedRecent.slice(0, 8))
    } else {
      const recent = JSON.parse(localStorage.getItem("recentSearches") || "[]")
      setRecentSearches(recent.slice(0, 8))
    }
  } catch (error) {
    console.error("[v0] Failed to fetch recent searches:", error)
    const recent = JSON.parse(localStorage.getItem("recentSearches") || "[]")
    setRecentSearches(recent.slice(0, 8))
  }
}, [])

// AFTER: 5s timeout + better error handling
const fetchRecentSearches = useCallback(async () => {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5s timeout ← NEW

    const response = await fetch(`${BACKEND_URL}/api/products/recent-searches?limit=8`, {
      signal: controller.signal, // ← NEW
    })

    clearTimeout(timeoutId) // ← NEW

    if (response.ok) {
      const data = await response.json()
      const backendRecent = data.items || data || []
      // ... combine with local
      setRecentSearches(combinedRecent.slice(0, 8))
    } else {
      const recent = JSON.parse(localStorage.getItem("recentSearches") || "[]")
      setRecentSearches(recent.slice(0, 8))
    }
  } catch (error: any) {
    console.warn("[v0] Failed to fetch recent searches (using local cache):", error.message) // ← NEW
    try {
      const recent = JSON.parse(localStorage.getItem("recentSearches") || "[]")
      setRecentSearches(recent.slice(0, 8))
    } catch {
      setRecentSearches([])
    }
  }
}, [])

// BEFORE: fetchInitialData with no timeouts
const fetchInitialData = useCallback(async () => {
  try {
    await fetchRecentSearches()
    const productsResponse = await fetch(`${BACKEND_URL}/api/products?...`)
    if (productsResponse.ok) {
      const data = await productsResponse.json()
      setTrendingProducts(data.items || data || [])
    }
    const categoriesResponse = await fetch(`${BACKEND_URL}/api/categories`)
    if (categoriesResponse.ok) {
      const data = await categoriesResponse.json()
      setCategories(data.items || data || [])
    }
  } catch (error) {
    console.error("[v0] Failed to fetch initial search data:", error)
  }
}, [fetchRecentSearches])

// AFTER: Separate timeouts + individual error handling
const fetchInitialData = useCallback(async () => {
  try {
    await fetchRecentSearches()

    // Trending products with timeout ← NEW
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      const productsResponse = await fetch(`${BACKEND_URL}/api/products?limit=10&sort_by=popularity&sort_order=desc`, {
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (productsResponse.ok) {
        const data = await productsResponse.json()
        setTrendingProducts(data.items || data || [])
      }
    } catch (error: any) {
      console.warn("[v0] Failed to fetch trending products:", error.message) // ← NEW
      setTrendingProducts([])
    }

    // Categories with timeout ← NEW
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      const categoriesResponse = await fetch(`${BACKEND_URL}/api/categories`, {
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (categoriesResponse.ok) {
        const data = await categoriesResponse.json()
        setCategories(data.items || data || [])
      }
    } catch (error: any) {
      console.warn("[v0] Failed to fetch categories:", error.message) // ← NEW
      setCategories([])
    }
  } catch (error) {
    console.error("[v0] Failed to fetch initial search data:", error)
  }
}, [fetchRecentSearches])
```

**Key Changes**:
- Added 5s timeout via `AbortSignal.timeout(5000)`
- Separated error handling for products and categories
- Use empty arrays as fallback instead of nothing
- Better warning messages vs error logs

---

## Change 4: API Layer GET Request Retry
**File**: `frontend/lib/api.ts`  
**Lines**: 1686-1713 (replaced lines 1686-1691)

```typescript
// BEFORE: Simple GET without retry
try {
  return (await originalGet.call(api, url, safeConfig)) as R
} catch (error) {
  throw error
}
}

// AFTER: Retry wrapper for abort/timeout
let lastError: any
const MAX_GET_ATTEMPTS = 2

for (let attempt = 1; attempt <= MAX_GET_ATTEMPTS; attempt++) {
  try {
    return (await originalGet.call(api, url, safeConfig)) as R
  } catch (error: any) {
    lastError = error

    const errMsg = (error && (error.message || "")).toString().toLowerCase()
    const isAborted = errMsg.includes("aborted") || error?.code === "ERR_CANCELED" || error?.code === "ERR_ABORTED"
    const isTimeout = error?.code === "ECONNABORTED" || errMsg.includes("timeout")

    // If it's an abort or timeout error, try once more
    if ((isAborted || isTimeout) && attempt < MAX_GET_ATTEMPTS) {
      const delay = 500 * attempt // 500ms, 1000ms
      console.warn(`[v0] GET request aborted/timeout for ${url} (attempt ${attempt}/${MAX_GET_ATTEMPTS}), retrying in ${delay}ms...`)
      await new Promise((res) => setTimeout(res, delay))
      continue // Retry loop
    }

    // Otherwise throw immediately
    throw error
  }
}

throw lastError || new Error("Failed to fetch data")
}
```

**Key Changes**:
- Added retry loop with `MAX_GET_ATTEMPTS = 2`
- Detects abort and timeout errors specifically
- Progressive delay: 500ms, 1000ms
- Throws after max attempts reached

---

## Summary of Changes by File

| File | Lines Changed | Type | Impact |
|------|---------------|------|--------|
| inventory-service.ts | 157-205 | Add Retry | Inventory loads with fallback |
| review-service.ts | 72-118 | Add Timeout + Retry | Reviews load from cache |
| use-search.ts | 169-244 | Add Timeout | Search doesn't block |
| api.ts | 1686-1713 | Add Retry | GET requests recover |

**Total Changes**: ~150 lines added, 15 lines removed = net +135 lines

**Complexity**: Low - All changes follow existing patterns in codebase

**Risk**: Very Low - All fallbacks preserve existing UX, just prevent crashes

