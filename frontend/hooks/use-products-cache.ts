// React hook for managing product caching with stale-while-revalidate pattern
// Reads from cache immediately, then fetches fresh data in background

"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import type { Product } from "@/types"
import * as productCache from "@/lib/cache/products"
import { startInvalidation, startSSEInvalidation } from "@/lib/cache/invalidation"

interface UseProductsCacheOptions {
  enableRealTimeSync?: boolean
  wsUrl?: string
  sseUrl?: string
  revalidateInterval?: number
}

export function useProductsCache(options: UseProductsCacheOptions = {}) {
  const { enableRealTimeSync = true, wsUrl, sseUrl, revalidateInterval = 300000 } = options

  const [cachedProducts, setCachedProducts] = useState<Product[]>([])
  const [isCacheLoading, setIsCacheLoading] = useState(true)
  const invalidationCleanupRef = useRef<() => void | null>()

  useEffect(() => {
    const loadCache = async () => {
      const cached = await productCache.getCachedProducts()
      setCachedProducts(cached)
      setIsCacheLoading(false)
    }

    loadCache()
  }, [])

  useEffect(() => {
    if (!enableRealTimeSync) return

    const handleInvalidation = async (productId: string | number, version: number) => {
      console.log(`[v0] Product ${productId} invalidated at version ${version}`)
      // Clear the specific product from cache
      await productCache.clearCachedProduct(productId)
      // Update local state
      setCachedProducts((prev) => prev.filter((p) => p.id !== productId))
    }

    // Try WebSocket first, fall back to SSE
    if (wsUrl) {
      invalidationCleanupRef.current = startInvalidation(wsUrl, handleInvalidation)
    } else if (sseUrl) {
      invalidationCleanupRef.current = startSSEInvalidation(sseUrl, handleInvalidation)
    }

    return () => {
      if (invalidationCleanupRef.current) {
        invalidationCleanupRef.current()
      }
    }
  }, [enableRealTimeSync, wsUrl, sseUrl])

  useEffect(() => {
    const handleProductInvalidated = (event: Event) => {
      const { productId } = (event as CustomEvent).detail
      const updated = cachedProducts.filter((p) => p.id !== productId)
      setCachedProducts(updated)
    }

    const handleProductsCleared = (event?: Event) => {
      setCachedProducts([])
      void productCache.clearAllCachedProducts()
    }

    window.addEventListener("product-invalidated", handleProductInvalidated)
    window.addEventListener("products-cleared", handleProductsCleared)

    return () => {
      window.removeEventListener("product-invalidated", handleProductInvalidated)
      window.removeEventListener("products-cleared", handleProductsCleared)
    }
  }, [cachedProducts])

  // Update cache when new products are fetched
  const updateCache = useCallback(async (products: Product[], version = 1) => {
    await productCache.setCachedProducts(products, version)
    setCachedProducts(products)
    await productCache.setMeta("lastSyncAt", new Date().toISOString())
  }, [])

  return {
    cachedProducts,
    isCacheLoading,
    updateCache,
    clearCache: productCache.clearAllCachedProducts,
    getCachedProduct: productCache.getCachedProduct,
  }
}
