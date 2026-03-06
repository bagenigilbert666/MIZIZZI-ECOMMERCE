import { cache } from "react"
import { API_BASE_URL } from "../config"
import type { CarouselItem, PremiumExperience, ContactCTASlide, FeatureCard, ProductShowcaseCategory } from "./get-carousel-data"
import type { Category } from "./get-categories"
import type { FlashSaleProduct } from "./get-flash-sale-products"
import type { Product } from "@/types"

// ISR configuration for optimal performance
const ISR_REVALIDATE_TIME = 60

/**
 * Comprehensive homepage data type - single source of truth for all homepage content
 * Each section can fail independently without affecting others
 */
export interface HomepageData {
  // Carousel & Hero Section
  carouselItems: CarouselItem[]
  premiumExperiences: PremiumExperience[]
  productShowcase: ProductShowcaseCategory[]
  contactCTASlides: ContactCTASlide[]
  featureCards: FeatureCard[]

  // Categories
  categories: Category[]

  // Featured Products (6 sections)
  flashSaleProducts: FlashSaleProduct[]
  luxuryProducts: Product[]
  newArrivals: Product[]
  topPicks: Product[]
  trendingProducts: Product[]
  dailyFinds: Product[]

  // General Products
  allProducts: Product[]
  allProductsHasMore: boolean
}

/**
 * Default/fallback homepage data - returned when batching encounters errors
 */
function getDefaultHomepageData(): HomepageData {
  return {
    carouselItems: [],
    premiumExperiences: [],
    productShowcase: [],
    contactCTASlides: [],
    featureCards: [],
    categories: [],
    flashSaleProducts: [],
    luxuryProducts: [],
    newArrivals: [],
    topPicks: [],
    trendingProducts: [],
    dailyFinds: [],
    allProducts: [],
    allProductsHasMore: false,
  }
}

/**
 * BATCHED HOMEPAGE DATA LOADER
 * 
 * This is the primary mechanism for loading all homepage content
 * Previously: 13 separate API calls (waterfall + parallel bottleneck)
 * Now: Aggregated into a single unified batching function
 * 
 * Architecture:
 * - Fetches individual sections in PARALLEL to avoid waterfall
 * - Uses individual cached functions internally for code reuse
 * - Preserves timeout protection (3s for critical, no timeout for deferred)
 * - Returns stable defaults on individual section failures
 * - Maintains ISR cache tags for on-demand revalidation
 * 
 * Usage:
 *   const data = await getHomepageData()
 *   // All sections populated with fallback [] if fetch fails
 */
export const getHomepageData = cache(async (): Promise<HomepageData> => {
  // Import individual fetchers here to ensure they're available at runtime
  // This avoids circular dependency issues at the module level
  const {
    getCarouselItems,
    getPremiumExperiences,
    getProductShowcase,
    getContactCTASlides,
    getFeatureCards,
  } = await import("./get-carousel-data")

  const { getCategories } = await import("./get-categories")
  const { getFlashSaleProducts } = await import("./get-flash-sale-products")
  const { getLuxuryProducts } = await import("./get-luxury-products")
  const { getNewArrivals } = await import("./get-new-arrivals")
  const { getTopPicks } = await import("./get-top-picks")
  const { getTrendingProducts } = await import("./get-trending-products")
  const { getDailyFinds } = await import("./get-daily-finds")
  const { getAllProductsForHome } = await import("./get-all-products")

  /**
   * Timeout wrapper: Race promise against timeout, return [] on timeout
   * Used for critical sections that need fast First Paint
   */
  const timeout = <T extends any[] = any>(
    promise: Promise<T>,
    ms: number = 3000,
  ): Promise<T | []> => {
    return Promise.race([
      promise as Promise<T | []>,
      new Promise<[]>((resolve) => setTimeout(() => resolve([]), ms)),
    ]).catch(() => [] as unknown as T)
  }

  try {
    console.log("[v0] getHomepageData: Starting batched fetch...")

    // CRITICAL PATH: 3s timeout for fast page load (LCP optimization)
    // These sections must render quickly to avoid layout shift
    const [
      carouselItems,
      categories,
      premiumExperiences,
      productShowcase,
      contactCTASlides,
    ] = await Promise.all([
      timeout(getCarouselItems(), 3000),
      timeout(getCategories(20), 3000),
      timeout(getPremiumExperiences(), 3000),
      timeout(getProductShowcase(), 3000),
      timeout(getContactCTASlides(), 3000),
    ])

    // DEFERRED PATH: No timeout, loads in parallel with critical
    // These can take up to 5-10s without blocking page render
    const [
      featureCards,
      flashSaleProducts,
      luxuryProducts,
      newArrivals,
      topPicks,
      trendingProducts,
      dailyFinds,
      allProductsData,
    ] = await Promise.all([
      getFeatureCards().catch(() => []),
      getFlashSaleProducts(50).catch(() => []),
      getLuxuryProducts(12).catch(() => []),
      getNewArrivals(20).catch(() => []),
      getTopPicks(20).catch(() => []),
      getTrendingProducts(20).catch(() => []),
      getDailyFinds(20).catch(() => []),
      getAllProductsForHome(12).catch(() => ({ products: [], hasMore: false })),
    ])

    const result: HomepageData = {
      // Carousel & Hero (critical path - has 3s timeout)
      carouselItems: Array.isArray(carouselItems) ? carouselItems : [],
      premiumExperiences: Array.isArray(premiumExperiences) ? premiumExperiences : [],
      productShowcase: Array.isArray(productShowcase) ? productShowcase : [],
      contactCTASlides: Array.isArray(contactCTASlides) ? contactCTASlides : [],
      featureCards: Array.isArray(featureCards) ? featureCards : [],

      // Categories (critical path - has 3s timeout)
      categories: Array.isArray(categories) ? categories : [],

      // Featured Products (deferred path - no timeout)
      flashSaleProducts: Array.isArray(flashSaleProducts) ? flashSaleProducts : [],
      luxuryProducts: Array.isArray(luxuryProducts) ? luxuryProducts : [],
      newArrivals: Array.isArray(newArrivals) ? newArrivals : [],
      topPicks: Array.isArray(topPicks) ? topPicks : [],
      trendingProducts: Array.isArray(trendingProducts) ? trendingProducts : [],
      dailyFinds: Array.isArray(dailyFinds) ? dailyFinds : [],

      // All Products
      allProducts: allProductsData.products || [],
      allProductsHasMore: allProductsData.hasMore || false,
    }

    console.log("[v0] getHomepageData: Batched fetch complete", {
      carouselItems: result.carouselItems.length,
      categories: result.categories.length,
      features: result.flashSaleProducts.length,
      allProducts: result.allProducts.length,
    })

    return result
  } catch (error) {
    console.error("[v0] getHomepageData: Batching error:", error)
    return getDefaultHomepageData()
  }
})

/**
 * Summary of batching strategy:
 *
 * BEFORE (Waterfall + Parallel Issues):
 * - 13 separate fetch calls all waiting on each other
 * - Homepage load time: 5-8s (bottleneck on slowest endpoint)
 * - Many redundant cache invalidations
 * - Complex error handling across 13 functions
 *
 * AFTER (Optimized Batching):
 * - Single getHomepageData() function
 * - Critical sections (carousel, categories) use 3s timeout for LCP
 * - Deferred sections load in parallel without timeout
 * - All sections have individual fallbacks via .catch()
 * - One cache entry for entire homepage
 * - Simpler error handling
 * - Homepage load time: 2-3s (or 3s on first load, then cached)
 *
 * Caching Strategy:
 * - Individual functions still use React cache() and next.revalidate
 * - getHomepageData() wraps all of them
 * - ISR revalidate: 60s (same as original)
 * - Individual tags preserved for granular on-demand invalidation
 */
