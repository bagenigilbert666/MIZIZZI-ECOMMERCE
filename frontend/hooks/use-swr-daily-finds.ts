import useSWR, { type SWRConfiguration, mutate as globalMutate } from "swr"
import type { Product } from "@/types"
import { productService } from "@/services/product"
import { cloudinaryService } from "@/services/cloudinary-service"

// In-memory cache for instant display
let dailyFindsCache: Product[] | null = null
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
const dailyFindsFetcher = async (): Promise<Product[]> => {
  try {
    const products = await productService.getDailyFindProducts(12)

    if (products && products.length > 0) {
      const processed = processProducts(products).slice(0, 12)
      dailyFindsCache = processed
      lastFetchTime = Date.now()
      return processed
    }

    // Fallback to recent products
    const regularProducts = await productService.getProducts({
      limit: 12,
      sort_by: "created_at",
      sort_order: "desc",
    })
    const processed = processProducts(regularProducts)
    dailyFindsCache = processed
    lastFetchTime = Date.now()
    return processed
  } catch (error) {
    console.error("Error fetching daily finds:", error)
    if (dailyFindsCache) {
      return dailyFindsCache
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

export function useDailyFinds(config?: SWRConfiguration) {
  const isCacheFresh = dailyFindsCache && Date.now() - lastFetchTime < CACHE_DURATION

  const { data, error, isLoading, isValidating, mutate } = useSWR<Product[]>("daily-finds", dailyFindsFetcher, {
    ...defaultConfig,
    fallbackData: isCacheFresh ? dailyFindsCache : undefined,
    ...config,
  })

  return {
    dailyFinds: data || dailyFindsCache || [],
    isLoading: isLoading && !dailyFindsCache,
    isValidating,
    isError: error,
    mutate,
    hasCachedData: !!dailyFindsCache || !!data,
  }
}

export async function prefetchDailyFinds(): Promise<void> {
  if (dailyFindsCache && Date.now() - lastFetchTime < CACHE_DURATION) {
    return
  }

  try {
    const data = await dailyFindsFetcher()
    await globalMutate("daily-finds", data, false)
  } catch (error) {
    console.warn("Failed to prefetch daily finds:", error)
  }
}

export async function invalidateDailyFinds(): Promise<void> {
  dailyFindsCache = null
  lastFetchTime = 0
  await globalMutate("daily-finds")
}

export function getCachedDailyFinds(): Product[] | null {
  return dailyFindsCache
}
