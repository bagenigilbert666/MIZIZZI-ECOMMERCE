/**
 * Quick Fetch Products Module
 *
 * This module ensures products fetch immediately without waiting for the API.
 * It uses a non-blocking fetch strategy with deduplication to prevent multiple
 * concurrent API calls for the same product set.
 *
 * Features:
 * - Instant cache read (in-memory)
 * - Non-blocking background fetch
 * - Request deduplication (only one fetch per key)
 * - Auto-retry on network errors
 * - Configurable cache TTL
 */

import type { Product } from "@/types"
import { productService } from "@/services/product"

interface CacheEntry {
  data: Product[]
  timestamp: number
}

interface FetchRequest {
  promise: Promise<Product[]>
  controller: AbortController
  startTime: number
}

// Main cache store
const cache = new Map<string, CacheEntry>()

// Track in-flight requests to prevent duplicate fetches
const inFlightRequests = new Map<string, FetchRequest>()

// Configuration
const DEFAULT_CACHE_TTL = 2 * 60 * 1000 // 2 minutes
const REQUEST_TIMEOUT = 10000 // 10 seconds
const RETRY_DELAY = 500 // 500ms between retries

/**
 * Generate a cache key from product fetch parameters
 */
export function generateCacheKey(params: {
  limit?: number
  category?: string
  page?: number
  flash_sale?: boolean
  luxury_deal?: boolean
  trending?: boolean
  new_arrival?: boolean
  daily_find?: boolean
  top_pick?: boolean
}): string {
  const parts = [
    params.limit || 12,
    params.category || "all",
    params.page || 1,
    params.flash_sale ? "flash" : "no-flash",
    params.luxury_deal ? "luxury" : "no-luxury",
    params.trending ? "trending" : "no-trending",
    params.new_arrival ? "new" : "no-new",
    params.daily_find ? "daily" : "no-daily",
    params.top_pick ? "toppick" : "no-toppick",
  ]
  return `products:${parts.join("|")}`
}

/**
 * Check if cache is still valid
 */
function isCacheValid(entry: CacheEntry, ttl: number = DEFAULT_CACHE_TTL): boolean {
  return Date.now() - entry.timestamp < ttl
}

/**
 * Fetch products with automatic retry and deduplication
 */
async function fetchProductsWithRetry(key: string, params: any, retryCount = 0, maxRetries = 2): Promise<Product[]> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

  try {
    const products = await Promise.race([
      productService.getProducts({
        ...params,
        signal: controller.signal as any,
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Request timeout")), REQUEST_TIMEOUT)),
    ])

    clearTimeout(timeoutId)

    if (!products || !Array.isArray(products)) {
      throw new Error("Invalid response format")
    }

    // Update cache on successful fetch
    cache.set(key, {
      data: products,
      timestamp: Date.now(),
    })

    // Remove from in-flight
    inFlightRequests.delete(key)

    return products
  } catch (error) {
    clearTimeout(timeoutId)

    // Retry logic: exponential backoff
    if (retryCount < maxRetries) {
      const delay = RETRY_DELAY * Math.pow(2, retryCount)
      await new Promise((resolve) => setTimeout(resolve, delay))
      return fetchProductsWithRetry(key, params, retryCount + 1, maxRetries)
    }

    // Remove from in-flight on final failure
    inFlightRequests.delete(key)

    // If we have cached data, return it as fallback
    const cachedEntry = cache.get(key)
    if (cachedEntry) {
      console.warn(`[v0] Using stale cache for ${key} due to fetch error:`, error)
      return cachedEntry.data
    }

    throw error
  }
}

/**
 * Quick fetch: returns cached data immediately, fetches in background
 * This is the main method you should use for instant product loading
 */
export async function quickFetchProducts(params: {
  limit?: number
  category?: string
  page?: number
  flash_sale?: boolean
  luxury_deal?: boolean
  trending?: boolean
  new_arrival?: boolean
  daily_find?: boolean
  top_pick?: boolean
  forceRefresh?: boolean
}): Promise<Product[]> {
  const key = generateCacheKey(params)
  const cachedEntry = cache.get(key)
  const { forceRefresh, ...fetchParams } = params

  // Return cached data immediately if valid
  if (!forceRefresh && cachedEntry && isCacheValid(cachedEntry)) {
    console.log(`[v0] Serving ${key} from quick cache (${cachedEntry.data.length} products)`)
    return cachedEntry.data
  }

  // Check if fetch is already in progress
  const inFlight = inFlightRequests.get(key)
  if (inFlight) {
    console.log(`[v0] Reusing in-flight fetch for ${key}`)
    return inFlight.promise
  }

  // Start new fetch in background
  console.log(`[v0] Starting background fetch for ${key}`)
  const controller = new AbortController()
  const fetchPromise = fetchProductsWithRetry(key, fetchParams)

  // Store in-flight request
  inFlightRequests.set(key, {
    promise: fetchPromise,
    controller,
    startTime: Date.now(),
  })

  // Return stale cache immediately, let background fetch update it
  if (cachedEntry) {
    console.log(`[v0] Returning stale cache for ${key}, updating in background`)
    // Don't await - let it update in background
    fetchPromise.catch((err) => console.warn(`[v0] Background fetch failed for ${key}:`, err))
    return cachedEntry.data
  }

  // No cache, must wait for fetch (first load)
  try {
    return await fetchPromise
  } catch (error) {
    console.error(`[v0] Failed to fetch products for ${key}:`, error)
    return []
  }
}

/**
 * Eagerly prefetch products (starts fetch immediately)
 * Use this during app initialization or route transitions
 */
export async function eagerPrefetchProducts(params: {
  limit?: number
  category?: string
  page?: number
  flash_sale?: boolean
  luxury_deal?: boolean
  trending?: boolean
  new_arrival?: boolean
  daily_find?: boolean
  top_pick?: boolean
}): Promise<void> {
  const key = generateCacheKey(params)

  // Skip if already cached and valid
  const cachedEntry = cache.get(key)
  if (cachedEntry && isCacheValid(cachedEntry)) {
    console.log(`[v0] Skipping eager prefetch for ${key} - already cached`)
    return
  }

  // Check if fetch is already in progress
  if (inFlightRequests.has(key)) {
    console.log(`[v0] Skipping eager prefetch for ${key} - fetch already in progress`)
    return
  }

  // Start fetch
  const controller = new AbortController()
  const fetchPromise = fetchProductsWithRetry(key, params)

  inFlightRequests.set(key, {
    promise: fetchPromise,
    controller,
    startTime: Date.now(),
  })

  // Don't await - let it happen in background
  fetchPromise
    .then(() => console.log(`[v0] Eager prefetch completed for ${key}`))
    .catch((err) => console.warn(`[v0] Eager prefetch failed for ${key}:`, err))
}

/**
 * Get cached data without fetching
 */
export function getCachedProducts(params: {
  limit?: number
  category?: string
  page?: number
  flash_sale?: boolean
  luxury_deal?: boolean
  trending?: boolean
  new_arrival?: boolean
  daily_find?: boolean
  top_pick?: boolean
}): Product[] | null {
  const key = generateCacheKey(params)
  const entry = cache.get(key)
  if (entry && isCacheValid(entry)) {
    return entry.data
  }
  return null
}

/**
 * Invalidate specific cache entries or all caches
 */
export function invalidateCache(key?: string): void {
  if (key) {
    cache.delete(key)
    inFlightRequests.get(key)?.controller.abort()
    inFlightRequests.delete(key)
    console.log(`[v0] Invalidated cache for ${key}`)
  } else {
    // Clear all
    cache.clear()
    inFlightRequests.forEach((req) => req.controller.abort())
    inFlightRequests.clear()
    console.log(`[v0] Cleared all product caches`)
  }
}

/**
 * Get cache statistics (useful for debugging)
 */
export function getCacheStats() {
  return {
    cachedKeys: Array.from(cache.keys()),
    cachedCount: cache.size,
    inFlightRequests: Array.from(inFlightRequests.keys()),
    inFlightCount: inFlightRequests.size,
    totalMemory: `${(JSON.stringify(Array.from(cache.entries())).length / 1024).toFixed(2)} KB`,
  }
}

/**
 * Clear all caches and in-flight requests
 */
export function resetAllCaches(): void {
  cache.clear()
  inFlightRequests.forEach((req) => req.controller.abort())
  inFlightRequests.clear()
  console.log(`[v0] All caches reset`)
}
