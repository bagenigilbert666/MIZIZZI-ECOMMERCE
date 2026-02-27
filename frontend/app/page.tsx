import { Suspense } from "react"
import { getCarouselItems, getPremiumExperiences, getProductShowcase, getContactCTASlides, getFeatureCards } from "@/lib/server/get-carousel-data"
import { getCategories } from "@/lib/server/get-categories"
import { getFlashSaleProducts } from "@/lib/server/get-flash-sale-products"
import { getLuxuryProducts } from "@/lib/server/get-luxury-products"
import { getNewArrivals } from "@/lib/server/get-new-arrivals"
import { getTopPicks } from "@/lib/server/get-top-picks"
import { getTrendingProducts } from "@/lib/server/get-trending-products"
import { getDailyFinds } from "@/lib/server/get-daily-finds"
import { getAllProductsForHome } from "@/lib/server/get-all-products"
import { HomeContent } from "@/components/home/home-content"

export const revalidate = 60

/**
 * JUMIA-STYLE HOMEPAGE: Render once with all data, no duplicate components
 * Critical data has 3-second timeout for instant LCP with defaults
 * Deferred data loads in parallel with no waterfall delays
 * Single component render eliminates duplicate page layout issues
 */

async function LoadAllContent() {
  // More reasonable timeouts for external API calls
  // 8 seconds for critical data to give the API time to respond
  const timeout = <T extends any[] = any>(promise: Promise<T>, ms: number = 8000): Promise<T | []> => {
    return Promise.race([
      promise as Promise<T | []>,
      new Promise<[]>(resolve => setTimeout(() => resolve([]), ms))
    ]).catch(() => {
      console.log(`[v0] Request timed out after ${ms}ms, using empty data`)
      return [] as unknown as T
    })
  }

  try {
    const [
      categories,
      carouselItems,
      premiumExperiences,
      productShowcase,
      contactCTASlides,
      featureCards,
      flashSaleProducts,
      luxuryProducts,
      newArrivals,
      topPicks,
      trendingProducts,
      dailyFinds,
      allProductsData,
    ] = await Promise.all([
      // Critical - with 8-second timeout to allow slower APIs to respond
      timeout(getCategories(20), 8000),
      timeout(getCarouselItems(), 8000),
      timeout(getPremiumExperiences(), 8000),
      timeout(getProductShowcase(), 8000),
      timeout(getContactCTASlides(), 8000),
      // Deferred - with generous timeout, gracefully handle failures
      timeout(getFeatureCards().catch(() => []), 10000),
      timeout(getFlashSaleProducts(50).catch(() => []), 10000),
      timeout(getLuxuryProducts(12).catch(() => []), 10000),
      timeout(getNewArrivals(20).catch(() => []), 10000),
      timeout(getTopPicks(20).catch(() => []), 10000),
      timeout(getTrendingProducts(20).catch(() => []), 10000),
      timeout(getDailyFinds(20).catch(() => []), 10000),
      timeout(getAllProductsForHome(12).catch(() => ({ products: [], hasMore: false })), 10000),
    ])

    return {
      categories: Array.isArray(categories) ? categories : [],
      carouselItems: Array.isArray(carouselItems) ? carouselItems : [],
      premiumExperiences: Array.isArray(premiumExperiences) ? premiumExperiences : [],
      productShowcase: Array.isArray(productShowcase) ? productShowcase : [],
      contactCTASlides: Array.isArray(contactCTASlides) ? contactCTASlides : [],
      featureCards: Array.isArray(featureCards) ? featureCards : [],
      flashSaleProducts: Array.isArray(flashSaleProducts) ? flashSaleProducts : [],
      luxuryProducts: Array.isArray(luxuryProducts) ? luxuryProducts : [],
      newArrivals: Array.isArray(newArrivals) ? newArrivals : [],
      topPicks: Array.isArray(topPicks) ? topPicks : [],
      trendingProducts: Array.isArray(trendingProducts) ? trendingProducts : [],
      dailyFinds: Array.isArray(dailyFinds) ? dailyFinds : [],
      allProducts: allProductsData.products || [],
      allProductsHasMore: allProductsData.hasMore || false,
    }
  } catch (error) {
    console.error("[v0] Content loading error:", error)
    return {
      categories: [],
      carouselItems: [],
      premiumExperiences: [],
      productShowcase: [],
      contactCTASlides: [],
      featureCards: [],
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
}

export default async function Home() {
  const data = await LoadAllContent()

  return (
    <HomeContent
      categories={data.categories}
      carouselItems={data.carouselItems}
      premiumExperiences={data.premiumExperiences}
      productShowcase={data.productShowcase}
      contactCTASlides={data.contactCTASlides}
      featureCards={data.featureCards}
      flashSaleProducts={data.flashSaleProducts}
      luxuryProducts={data.luxuryProducts}
      newArrivals={data.newArrivals}
      topPicks={data.topPicks}
      trendingProducts={data.trendingProducts}
      dailyFinds={data.dailyFinds}
      allProducts={data.allProducts}
      allProductsHasMore={data.allProductsHasMore}
    />
  )
}
