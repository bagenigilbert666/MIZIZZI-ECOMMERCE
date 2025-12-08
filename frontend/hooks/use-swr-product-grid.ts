import useSWR, { type SWRConfiguration, mutate as globalMutate } from "swr"
import type { Product } from "@/types"
import { productService } from "@/services/product"
import { cloudinaryService } from "@/services/cloudinary-service"

// In-memory cache for instant display
const productGridCache: Map<string, Product[]> = new Map()
const lastFetchTimes: Map<string, number> = new Map()
const CACHE_DURATION = 2 * 60 * 1000 // 2 minutes

// Generate cache key based on params
const getCacheKey = (limit: number, category?: string, page?: number) => {
  return `product-grid-${limit}-${category || "all"}-${page || 1}`
}

// Process product images
const processProducts = (products: Product[]): Product[] => {
  return products.map((product) => ({
    ...product,
    image_urls: (product.image_urls || []).map((url) => {
      if (typeof url === "string" && !url.startsWith("http")) {
        return cloudinaryService.generateOptimizedUrl(url)
      }
      return url
    }),
  }))
}

// Fetcher function
const productGridFetcher = async (key: string): Promise<Product[]> => {
  const [, limitStr, category, pageStr] = key.split("-").slice(1)
  const limit = Number.parseInt(limitStr) || 12
  const page = Number.parseInt(pageStr) || 1
  const categorySlug = category === "all" ? undefined : category

  try {
    const products = await productService.getProducts({
      limit,
      category_slug: categorySlug,
      page,
    })

    const processed = processProducts(products || [])
    productGridCache.set(key, processed)
    lastFetchTimes.set(key, Date.now())
    return processed
  } catch (error) {
    console.error("Error fetching product grid:", error)
    // Return cached data on error if available
    const cached = productGridCache.get(key)
    if (cached) {
      return cached
    }
    throw error
  }
}

// Default SWR configuration
const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 60000,
  focusThrottleInterval: 300000,
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  revalidateIfStale: true,
  keepPreviousData: true,
}

interface UseProductGridOptions {
  limit?: number
  category?: string
  page?: number
  config?: SWRConfiguration
}

export function useProductGrid({ limit = 12, category, page = 1, config }: UseProductGridOptions = {}) {
  const cacheKey = getCacheKey(limit, category, page)
  const cachedData = productGridCache.get(cacheKey)
  const lastFetch = lastFetchTimes.get(cacheKey) || 0
  const isFreshCache = cachedData && Date.now() - lastFetch < CACHE_DURATION

  const { data, error, isLoading, isValidating, mutate } = useSWR<Product[]>(cacheKey, productGridFetcher, {
    ...defaultConfig,
    fallbackData: isFreshCache ? cachedData : undefined,
    ...config,
  })

  return {
    products: data || cachedData || [],
    isLoading: isLoading && !cachedData,
    isValidating,
    isError: error,
    mutate,
    hasCachedData: !!cachedData,
    hasMore: (data?.length || 0) >= limit,
  }
}

// Prefetch product grid - call this on app mount for instant loading
export async function prefetchProductGrid(limit = 12, category?: string): Promise<void> {
  const cacheKey = getCacheKey(limit, category, 1)
  const lastFetch = lastFetchTimes.get(cacheKey) || 0

  // If we have fresh cache, skip prefetch
  if (productGridCache.has(cacheKey) && Date.now() - lastFetch < CACHE_DURATION) {
    return
  }

  try {
    const data = await productGridFetcher(cacheKey)
    await globalMutate(cacheKey, data, false)
  } catch (error) {
    console.warn("Failed to prefetch product grid:", error)
  }
}

// Invalidate cache
export async function invalidateProductGrid(): Promise<void> {
  productGridCache.clear()
  lastFetchTimes.clear()
  // Revalidate all product grid keys
  const keys = Array.from(productGridCache.keys())
  await Promise.all(keys.map((key) => globalMutate(key)))
}

// Get cached products
export function getCachedProductGrid(limit: number, category?: string): Product[] | null {
  const cacheKey = getCacheKey(limit, category, 1)
  return productGridCache.get(cacheKey) || null
}

export default useProductGrid
