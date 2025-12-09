import useSWR, { type SWRConfiguration, mutate as globalMutate } from "swr"
import type { Product } from "@/types"
import { productService } from "@/services/product"
import { cloudinaryService } from "@/services/cloudinary-service"

// In-memory cache for instant display
let flashSalesCache: Product[] | null = null
let lastFetchTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

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

const flashSalesFetcher = async (): Promise<Product[]> => {
  try {
    // First try to get actual flash sale products
    const flashProducts = await productService.getFlashSaleProducts()

    if (flashProducts && flashProducts.length > 0) {
      const processed = processProducts(flashProducts).slice(0, 12)
      flashSalesCache = processed
      lastFetchTime = Date.now()
      return processed
    }

    console.log("[v0] No flash sale products found, fetching sale products as fallback")
    const saleProducts = await productService.getProducts({
      limit: 12,
      sale: true,
      sort_by: "price",
      sort_order: "asc",
    })

    if (saleProducts && saleProducts.length > 0) {
      const processed = processProducts(saleProducts).slice(0, 12)
      flashSalesCache = processed
      lastFetchTime = Date.now()
      return processed
    }

    console.log("[v0] No sale products found, fetching regular products as final fallback")
    const regularProducts = await productService.getProducts({
      limit: 12,
      sort_by: "price",
      sort_order: "asc",
    })

    const processed = processProducts(regularProducts)
    flashSalesCache = processed
    lastFetchTime = Date.now()
    return processed
  } catch (error) {
    console.error("Error fetching flash sales:", error)
    // Return cached data on error if available
    if (flashSalesCache) {
      return flashSalesCache
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

export function useFlashSales(config?: SWRConfiguration) {
  const isCacheFresh = flashSalesCache && Date.now() - lastFetchTime < CACHE_DURATION

  const { data, error, isLoading, isValidating, mutate } = useSWR<Product[]>("flash-sales", flashSalesFetcher, {
    ...defaultConfig,
    fallbackData: isCacheFresh ? flashSalesCache : undefined,
    ...config,
  })

  return {
    flashSales: data || flashSalesCache || [],
    isLoading: isLoading && !flashSalesCache,
    isValidating,
    isError: error,
    mutate,
    hasCachedData: !!flashSalesCache || !!data,
  }
}

// Prefetch flash sales - call this on app mount for instant loading
export async function prefetchFlashSales(): Promise<void> {
  if (flashSalesCache && Date.now() - lastFetchTime < CACHE_DURATION) {
    return
  }

  try {
    const data = await flashSalesFetcher()
    await globalMutate("flash-sales", data, false)
  } catch (error) {
    console.warn("Failed to prefetch flash sales:", error)
  }
}

// Invalidate cache - useful when admin updates flash sales
export async function invalidateFlashSales(): Promise<void> {
  flashSalesCache = null
  lastFetchTime = 0
  await globalMutate("flash-sales")
}

// Get cached flash sales without triggering fetch
export function getCachedFlashSales(): Product[] | null {
  return flashSalesCache
}
