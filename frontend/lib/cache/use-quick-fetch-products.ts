"use client"

/**
 * React Hook for Quick Product Fetching
 *
 * Simplifies quick fetch usage in React components with instant loading,
 * background updates, and built-in error handling.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import type { Product } from "@/types"
import {
  quickFetchProducts,
  eagerPrefetchProducts,
  invalidateCache,
  generateCacheKey,
  getCachedProducts,
} from "./products-quick-fetch"

interface UseQuickFetchProductsParams {
  limit?: number
  category?: string
  page?: number
  flash_sale?: boolean
  luxury_deal?: boolean
  trending?: boolean
  new_arrival?: boolean
  daily_find?: boolean
  top_pick?: boolean
  autoFetch?: boolean // Default: true
}

export function useQuickFetchProducts(params: UseQuickFetchProductsParams = {}) {
  const {
    autoFetch = true,
    limit,
    category,
    page,
    flash_sale,
    luxury_deal,
    trending,
    new_arrival,
    daily_find,
    top_pick,
  } = params

  const stableFetchParams = useMemo(
    () => ({
      limit,
      category,
      page,
      flash_sale,
      luxury_deal,
      trending,
      new_arrival,
      daily_find,
      top_pick,
    }),
    [limit, category, page, flash_sale, luxury_deal, trending, new_arrival, daily_find, top_pick],
  )

  const initialProducts = getCachedProducts(stableFetchParams) || []
  const [products, setProducts] = useState<Product[]>(initialProducts)

  const [isLoading, setIsLoading] = useState(!autoFetch || (autoFetch && initialProducts.length === 0))
  const [error, setError] = useState<Error | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  const fetchTimeRef = useRef<number>(0)

  const cacheKeyRef = useRef(generateCacheKey(stableFetchParams))

  // Main fetch function
  const fetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      console.log(`[v0] Fetching products with params:`, stableFetchParams)
      const data = await quickFetchProducts(stableFetchParams)
      setProducts(data)
      fetchTimeRef.current = Date.now()
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch products")
      setError(error)
      console.error(`[v0] Product fetch error:`, error)
    } finally {
      setIsLoading(false)
    }
  }, [stableFetchParams])

  // Refresh function (shows updating state)
  const refresh = useCallback(async () => {
    setIsUpdating(true)
    try {
      const data = await quickFetchProducts({ ...stableFetchParams, forceRefresh: true })
      setProducts(data)
      setError(null)
      fetchTimeRef.current = Date.now()
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to refresh products")
      setError(error)
    } finally {
      setIsUpdating(false)
    }
  }, [stableFetchParams])

  // Invalidate function
  const invalidate = useCallback(() => {
    const key = generateCacheKey(stableFetchParams)
    invalidateCache(key)
    setProducts([])
  }, [stableFetchParams])

  // Auto-fetch on mount and param changes
  useEffect(() => {
    if (autoFetch) {
      fetch()
    }
  }, [autoFetch, fetch])

  return {
    products,
    isLoading,
    isUpdating,
    error,
    fetch,
    refresh,
    invalidate,
    fetchTime: fetchTimeRef.current,
  }
}

/**
 * Hook for eager prefetching (non-blocking)
 */
export function useEagerPrefetch(params: UseQuickFetchProductsParams = {}) {
  const hasRun = useRef(false)

  useEffect(() => {
    if (!hasRun.current) {
      hasRun.current = true
      eagerPrefetchProducts(params).catch((err) => console.warn(`[v0] Eager prefetch failed:`, err))
    }
  }, [params])
}
