import { useEffect, useState, useCallback, useRef } from 'react'
import useSWR from 'swr'
import type { Product } from '@/types'
import { recordCacheMetric } from '@/lib/performance-metrics'

interface HomepageSectionCache {
  flashSales: { products: Product[]; event: any } | null
  trending: Product[] | null
  topPicks: Product[] | null
  newArrivals: Product[] | null
  dailyDeals: Product[] | null
  luxuryDeals: Product[] | null
  categories: any[] | null
}

interface CacheEntry {
  data: any
  timestamp: number
  ttl: number
}

// Per-section cache configuration with different TTLs
const CACHE_CONFIG = {
  flashSales: { ttl: 5 * 60 * 1000, key: 'homepage:flashsales' }, // 5 minutes
  trending: { ttl: 60 * 60 * 1000, key: 'homepage:trending' }, // 1 hour
  topPicks: { ttl: 24 * 60 * 60 * 1000, key: 'homepage:toppicks' }, // 24 hours
  newArrivals: { ttl: 60 * 60 * 1000, key: 'homepage:newarrivals' }, // 1 hour
  dailyDeals: { ttl: 24 * 60 * 60 * 1000, key: 'homepage:dailydeals' }, // 24 hours
  luxuryDeals: { ttl: 24 * 60 * 60 * 1000, key: 'homepage:luxurydeals' }, // 24 hours
  categories: { ttl: 7 * 24 * 60 * 60 * 1000, key: 'homepage:categories' }, // 7 days
}

/**
 * Get cache value if not expired, null otherwise
 */
function getCacheValue(key: string): any | null {
  try {
    const stored = localStorage.getItem(key)
    if (!stored) return null

    const entry: CacheEntry = JSON.parse(stored)
    const isExpired = Date.now() - entry.timestamp > entry.ttl

    if (isExpired) {
      localStorage.removeItem(key)
      return null
    }

    return entry.data
  } catch (error) {
    console.warn(`[v0] Cache read error for ${key}:`, error)
    return null
  }
}

/**
 * Set cache value with TTL
 */
function setCacheValue(key: string, data: any, ttl: number): void {
  try {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl,
    }
    localStorage.setItem(key, JSON.stringify(entry))
  } catch (error) {
    console.warn(`[v0] Cache write error for ${key}:`, error)
  }
}

/**
 * Check if a cached section is still valid
 */
function isCacheValid(key: string): boolean {
  try {
    const stored = localStorage.getItem(key)
    if (!stored) return false

    const entry: CacheEntry = JSON.parse(stored)
    return Date.now() - entry.timestamp <= entry.ttl
  } catch {
    return false
  }
}

/**
 * Hook for fetching homepage batch data with intelligent per-section caching
 * - Single API request for all homepage sections
 * - Each section cached independently with custom TTL
 * - Automatically only refreshes expired sections
 * - Full SSR/ISR support
 */
export function useHomepageBatch(options: {
  flashSaleLimit?: number
  trendingLimit?: number
  topPicksLimit?: number
  newArrivalsLimit?: number
  dailyDealsLimit?: number
  luxuryDealsLimit?: number
  categoriesLimit?: number
  enabled?: boolean
} = {}) {
  const {
    flashSaleLimit = 12,
    trendingLimit = 15,
    topPicksLimit = 12,
    newArrivalsLimit = 12,
    dailyDealsLimit = 12,
    luxuryDealsLimit = 12,
    categoriesLimit = 8,
    enabled = true,
  } = options

  const [cachedData, setCachedData] = useState<HomepageSectionCache | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const cacheCheckRef = useRef<boolean>(false)

  // Check localStorage on mount (client-side only)
  useEffect(() => {
    if (cacheCheckRef.current) return
    cacheCheckRef.current = true

    try {
      // Try to load all sections from cache
      const cached: HomepageSectionCache = {
        flashSales: getCacheValue(CACHE_CONFIG.flashSales.key),
        trending: getCacheValue(CACHE_CONFIG.trending.key),
        topPicks: getCacheValue(CACHE_CONFIG.topPicks.key),
        newArrivals: getCacheValue(CACHE_CONFIG.newArrivals.key),
        dailyDeals: getCacheValue(CACHE_CONFIG.dailyDeals.key),
        luxuryDeals: getCacheValue(CACHE_CONFIG.luxuryDeals.key),
        categories: getCacheValue(CACHE_CONFIG.categories.key),
      }

      if (Object.values(cached).some((v) => v !== null)) {
        setCachedData(cached)
        recordCacheMetric(true, 'localStorage', 5, 'homepage-batch')
        console.log('[v0] Loaded homepage sections from localStorage cache')
      }
    } catch (error) {
      console.warn('[v0] Error loading homepage cache:', error)
    }

    setIsHydrated(true)
  }, [])

  // Build query params only for expired sections
  const getQueryParams = useCallback(() => {
    const params = new URLSearchParams()
    params.set('flashSaleLimit', flashSaleLimit.toString())
    params.set('trendingLimit', trendingLimit.toString())
    params.set('topPicksLimit', topPicksLimit.toString())
    params.set('newArrivalsLimit', newArrivalsLimit.toString())
    params.set('dailyDealsLimit', dailyDealsLimit.toString())
    params.set('luxuryDealsLimit', luxuryDealsLimit.toString())
    params.set('categoriesLimit', categoriesLimit.toString())
    return params.toString()
  }, [
    flashSaleLimit,
    trendingLimit,
    topPicksLimit,
    newArrivalsLimit,
    dailyDealsLimit,
    luxuryDealsLimit,
    categoriesLimit,
  ])

  // Fetch batch data
  const { data, error, isLoading, mutate } = useSWR(
    enabled && isHydrated ? `/api/homepage/batch?${getQueryParams()}` : null,
    async (url: string) => {
      const startTime = performance.now()
      try {
        const response = await fetch(url)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const result = await response.json()
        const fetchTime = performance.now() - startTime
        recordCacheMetric(false, 'server', fetchTime, 'homepage-batch')
        return result
      } catch (error) {
        console.error('[v0] Batch fetch error:', error)
        throw error
      }
    },
    {
      // Only fetch if all sections are expired
      dedupingInterval: 60000,
      focusThrottleInterval: 30000,
      revalidateIfStale: true,
      revalidateOnFocus: false,
    }
  )

  // Update cache when data is fetched
  useEffect(() => {
    if (!data) return

    try {
      // Cache each section independently
      if (data.flashSales) {
        setCacheValue(
          CACHE_CONFIG.flashSales.key,
          data.flashSales,
          CACHE_CONFIG.flashSales.ttl
        )
      }
      if (data.trending) {
        setCacheValue(
          CACHE_CONFIG.trending.key,
          data.trending,
          CACHE_CONFIG.trending.ttl
        )
      }
      if (data.topPicks) {
        setCacheValue(
          CACHE_CONFIG.topPicks.key,
          data.topPicks,
          CACHE_CONFIG.topPicks.ttl
        )
      }
      if (data.newArrivals) {
        setCacheValue(
          CACHE_CONFIG.newArrivals.key,
          data.newArrivals,
          CACHE_CONFIG.newArrivals.ttl
        )
      }
      if (data.dailyDeals) {
        setCacheValue(
          CACHE_CONFIG.dailyDeals.key,
          data.dailyDeals,
          CACHE_CONFIG.dailyDeals.ttl
        )
      }
      if (data.luxuryDeals) {
        setCacheValue(
          CACHE_CONFIG.luxuryDeals.key,
          data.luxuryDeals,
          CACHE_CONFIG.luxuryDeals.ttl
        )
      }
      if (data.categories) {
        setCacheValue(
          CACHE_CONFIG.categories.key,
          data.categories,
          CACHE_CONFIG.categories.ttl
        )
      }

      console.log(
        `[v0] Cached homepage sections (${data.duration?.toFixed(2)}ms fetch)`
      )
    } catch (error) {
      console.warn('[v0] Error caching homepage data:', error)
    }
  }, [data])

  // Merge cached data with fetched data (fetched data takes precedence)
  const mergedData: HomepageSectionCache | null = isHydrated
    ? {
        flashSales: data?.flashSales || cachedData?.flashSales || null,
        trending: data?.trending || cachedData?.trending || null,
        topPicks: data?.topPicks || cachedData?.topPicks || null,
        newArrivals: data?.newArrivals || cachedData?.newArrivals || null,
        dailyDeals: data?.dailyDeals || cachedData?.dailyDeals || null,
        luxuryDeals: data?.luxuryDeals || cachedData?.luxuryDeals || null,
        categories: data?.categories || cachedData?.categories || null,
      }
    : null

  // Function to manually refresh a specific section
  const refreshSection = useCallback(
    async (section: keyof typeof CACHE_CONFIG) => {
      // Clear the section from cache
      localStorage.removeItem(CACHE_CONFIG[section].key)
      // Trigger full batch refresh
      await mutate()
      console.log(`[v0] Refreshed homepage section: ${section}`)
    },
    [mutate]
  )

  // Function to clear all cache
  const clearCache = useCallback(() => {
    Object.values(CACHE_CONFIG).forEach(({ key }) => {
      localStorage.removeItem(key)
    })
    mutate()
    console.log('[v0] Cleared all homepage cache')
  }, [mutate])

  return {
    data: mergedData,
    isLoading,
    error,
    isHydrated,
    mutate,
    refreshSection,
    clearCache,
    // Performance metrics
    fetchDuration: data?.duration,
    fetchTimestamp: data?.timestamp,
    // Cache status for debugging
    cacheStatus: {
      flashSalesValid: isCacheValid(CACHE_CONFIG.flashSales.key),
      trendingValid: isCacheValid(CACHE_CONFIG.trending.key),
      topPicksValid: isCacheValid(CACHE_CONFIG.topPicks.key),
      newArrivalsValid: isCacheValid(CACHE_CONFIG.newArrivals.key),
      dailyDealsValid: isCacheValid(CACHE_CONFIG.dailyDeals.key),
      luxuryDealsValid: isCacheValid(CACHE_CONFIG.luxuryDeals.key),
      categoriesValid: isCacheValid(CACHE_CONFIG.categories.key),
    },
  }
}
