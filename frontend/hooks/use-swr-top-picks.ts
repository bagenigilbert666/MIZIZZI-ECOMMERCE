import useSWR, { type SWRConfiguration, mutate as globalMutate } from "swr"
import type { Product } from "@/types"
import { productService } from "@/services/product"
import { cloudinaryService } from "@/services/cloudinary-service"

// In-memory cache for instant display
let topPicksCache: Product[] | null = null
let lastFetchTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const STALE_TIME = 30 * 1000 // 30 seconds

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

// Fetcher function with instant cache return
const topPicksFetcher = async (): Promise<Product[]> => {
  try {
    const products = await productService.getProducts({
      limit: 12,
      top_pick: true,
    })

    if (products && products.length > 0) {
      const processed = processProducts(products).slice(0, 12)
      topPicksCache = processed
      lastFetchTime = Date.now()
      return processed
    }

    // Fallback to highly rated products
    const fallbackProducts = await productService.getProducts({
      limit: 12,
      sort_by: "rating",
      sort_order: "desc",
    })
    const processed = processProducts(fallbackProducts)
    topPicksCache = processed
    lastFetchTime = Date.now()
    return processed
  } catch (error) {
    console.error("Error fetching top picks:", error)
    if (topPicksCache) {
      return topPicksCache
    }
    throw error
  }
}

const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 60000,
  focusThrottleInterval: 300000,
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  revalidateIfStale: true,
  keepPreviousData: true,
  refreshInterval: 0,
  shouldRetryOnError: true,
}

export function useTopPicks(config?: SWRConfiguration) {
  const isCacheFresh = topPicksCache && Date.now() - lastFetchTime < CACHE_DURATION

  const { data, error, isLoading, isValidating, mutate } = useSWR<Product[]>("top-picks", topPicksFetcher, {
    ...defaultConfig,
    fallbackData: isCacheFresh ? topPicksCache : undefined,
    ...config,
  })

  return {
    topPicks: data || topPicksCache || [],
    isLoading: isLoading && !topPicksCache,
    isValidating,
    isError: error,
    mutate,
    hasCachedData: !!topPicksCache || !!data,
  }
}

export async function prefetchTopPicks(): Promise<void> {
  if (topPicksCache && Date.now() - lastFetchTime < CACHE_DURATION) {
    return
  }

  try {
    const data = await topPicksFetcher()
    await globalMutate("top-picks", data, false)
  } catch (error) {
    console.warn("Failed to prefetch top picks:", error)
  }
}

export async function invalidateTopPicks(): Promise<void> {
  topPicksCache = null
  lastFetchTime = 0
  await globalMutate("top-picks")
}

export function getCachedTopPicks(): Product[] | null {
  return topPicksCache
}
