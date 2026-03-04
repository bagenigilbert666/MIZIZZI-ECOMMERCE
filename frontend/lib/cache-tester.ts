/**
 * Cache Testing Utility for Categories
 * 
 * This utility helps verify that the 3-layer caching strategy is working correctly.
 * Run these tests in your browser console to monitor cache performance.
 */

export interface CacheTestResult {
  layer: 'sessionStorage' | 'localStorage' | 'server'
  found: boolean
  data?: unknown
  loadTime: number
  timestamp: number
}

export class CacheTester {
  private static readonly CACHE_KEY = 'mizizzi_categories_cache'
  private static readonly CACHE_EXPIRY_KEY = 'mizizzi_categories_cache_expiry'

  /**
   * Test if categories are cached in sessionStorage (Layer 1)
   */
  static testSessionStorage(): CacheTestResult {
    const start = performance.now()
    try {
      const cached = sessionStorage.getItem(this.CACHE_KEY)
      const found = !!cached
      const loadTime = performance.now() - start

      console.log(`[v0] sessionStorage test: ${found ? 'FOUND' : 'NOT FOUND'} (${loadTime.toFixed(2)}ms)`)
      
      if (found) {
        const data = JSON.parse(cached!)
        console.log(`[v0] sessionStorage data:`, data)
      }

      return {
        layer: 'sessionStorage',
        found,
        data: found ? JSON.parse(cached!) : undefined,
        loadTime,
        timestamp: Date.now(),
      }
    } catch (error) {
      console.error('[v0] sessionStorage test error:', error)
      return {
        layer: 'sessionStorage',
        found: false,
        loadTime: performance.now() - start,
        timestamp: Date.now(),
      }
    }
  }

  /**
   * Test if categories are cached in localStorage (Layer 2)
   */
  static testLocalStorage(): CacheTestResult {
    const start = performance.now()
    try {
      const cached = localStorage.getItem(this.CACHE_KEY)
      const expiry = localStorage.getItem(this.CACHE_EXPIRY_KEY)
      const now = Date.now()

      let found = false
      let isExpired = false

      if (cached && expiry) {
        const expiryTime = parseInt(expiry, 10)
        isExpired = now > expiryTime
        found = !isExpired
      }

      const loadTime = performance.now() - start

      if (found) {
        console.log(`[v0] localStorage test: FOUND and VALID (${loadTime.toFixed(2)}ms)`)
      } else if (cached && isExpired) {
        console.log(`[v0] localStorage test: FOUND but EXPIRED (${loadTime.toFixed(2)}ms)`)
      } else {
        console.log(`[v0] localStorage test: NOT FOUND (${loadTime.toFixed(2)}ms)`)
      }

      if (cached) {
        const data = JSON.parse(cached)
        console.log(`[v0] localStorage data:`, data)
        if (expiry) {
          const timeLeft = Math.round((parseInt(expiry, 10) - now) / 1000)
          console.log(`[v0] localStorage expires in: ${timeLeft} seconds`)
        }
      }

      return {
        layer: 'localStorage',
        found,
        data: found ? JSON.parse(cached!) : undefined,
        loadTime,
        timestamp: Date.now(),
      }
    } catch (error) {
      console.error('[v0] localStorage test error:', error)
      return {
        layer: 'localStorage',
        found: false,
        loadTime: performance.now() - start,
        timestamp: Date.now(),
      }
    }
  }

  /**
   * Run all cache tests and display results
   */
  static runAllTests(): void {
    console.log('\n=== CACHE TESTING SUITE ===\n')

    const sessionResult = this.testSessionStorage()
    const localResult = this.testLocalStorage()

    console.log('\n--- CACHE TEST SUMMARY ---')
    console.table([
      {
        Layer: 'sessionStorage',
        Status: sessionResult.found ? '✓ CACHED' : '✗ EMPTY',
        LoadTime: `${sessionResult.loadTime.toFixed(2)}ms`,
      },
      {
        Layer: 'localStorage',
        Status: localResult.found ? '✓ CACHED' : '✗ EMPTY/EXPIRED',
        LoadTime: `${localResult.loadTime.toFixed(2)}ms`,
      },
    ])

    // Overall cache status
    const cacheHit = sessionResult.found || localResult.found
    console.log(`\n[v0] Overall Cache Status: ${cacheHit ? '✓ HIT (instant load)' : '✗ MISS (API fetch)'}`)
  }

  /**
   * Monitor cache over multiple page reloads
   * Run this after opening DevTools Network tab
   */
  static startMonitoring(): void {
    console.log('[v0] Cache monitoring started. Check console after each page reload.')
    
    if (typeof window !== 'undefined') {
      // Store monitoring flag
      sessionStorage.setItem('monitoring_cache', 'true')
    }

    this.runAllTests()
  }

  /**
   * Clear all cache for testing purposes
   */
  static clearAllCache(): void {
    try {
      sessionStorage.removeItem(this.CACHE_KEY)
      localStorage.removeItem(this.CACHE_KEY)
      localStorage.removeItem(this.CACHE_EXPIRY_KEY)
      console.log('[v0] All cache cleared successfully')
    } catch (error) {
      console.error('[v0] Error clearing cache:', error)
    }
  }

  /**
   * Get detailed cache statistics
   */
  static getStats(): void {
    const sessionResult = this.testSessionStorage()
    const localResult = this.testLocalStorage()

    const stats = {
      sessionCacheSize: sessionResult.data ? JSON.stringify(sessionResult.data).length : 0,
      localCacheSize: localResult.data ? JSON.stringify(localResult.data).length : 0,
      sessionLoadTime: sessionResult.loadTime,
      localLoadTime: localResult.loadTime,
      cacheHit: sessionResult.found || localResult.found,
      hitSource: sessionResult.found ? 'sessionStorage' : localResult.found ? 'localStorage' : 'none',
    }

    console.log('\n--- CACHE STATISTICS ---')
    console.table(stats)
    
    return stats
  }
}

// Export as window object for console access
if (typeof window !== 'undefined') {
  ;(window as any).CacheTester = CacheTester
}

/**
 * USAGE INSTRUCTIONS:
 * 
 * 1. Open DevTools Console (F12)
 * 2. First page load (cache empty):
 *    CacheTester.runAllTests()  // Shows MISS
 * 
 * 3. Reload page (Ctrl+R):
 *    CacheTester.runAllTests()  // Shows HIT (sessionStorage)
 * 
 * 4. Close browser, reopen same page:
 *    CacheTester.runAllTests()  // Shows HIT (localStorage) 
 * 
 * 5. Check statistics:
 *    CacheTester.getStats()  // Shows all metrics
 * 
 * 6. Clear cache to test fresh fetch:
 *    CacheTester.clearAllCache()
 *    location.reload()  // Should show MISS again
 */
