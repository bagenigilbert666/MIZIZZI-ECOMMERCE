import { Suspense } from "react"
import { getUIBatch } from "@/lib/server/get-ui-batch"
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
 * OPTIMIZED HOMEPAGE: Uses unified batch API for carousel, categories, and side panels
 * Product data loads in parallel with efficient timeout handling
 * Single page render with gradual enhancement of UI components
 */

async function LoadAllContent() {
  const timeout = <T extends any[] = any>(promise: Promise<T>, ms: number = 3000): Promise<T | []> => {
    return Promise.race([
      promise as Promise<T | []>,
      new Promise<[]>(resolve => setTimeout(() => resolve([]), ms))
    ]).catch(() => [] as unknown as T)
  }

  try {
    // Fetch UI batch data (carousel, categories, side panels) in a single request
    const uiBatchPromise = getUIBatch().catch(() => ({
      carousel: [],
      topbar: null,
      categories: [],
      sidePanels: null,
      timestamp: Date.now(),
      duration: 0,
    }))

    // Fetch product data in parallel with UI batch
    const [
      uiBatchData,
      featureCards,
      flashSaleProducts,
      luxuryProducts,
      newArrivals,
      topPicks,
      trendingProducts,
      dailyFinds,
      allProductsData,
    ] = await Promise.all([
      // UI batch data - single request for carousel, categories, side panels
      timeout(uiBatchPromise, 3000),
      // Feature cards - from existing source (can be migrated to batch later)
      getFeatureCards().catch(() => []),
      // All product data fetches in parallel
      getFlashSaleProducts(50).catch(() => []),
      getLuxuryProducts(12).catch(() => []),
      getNewArrivals(20).catch(() => []),
      getTopPicks(20).catch(() => []),
      getTrendingProducts(20).catch(() => []),
      getDailyFinds(20).catch(() => []),
      getAllProductsForHome(12).catch(() => ({ products: [], hasMore: false })),
    ])

    // Normalize carousel items from batch response
    const carouselItems = Array.isArray(uiBatchData?.carousel) 
      ? uiBatchData.carousel 
      : []

    // Normalize categories from batch response  
    const categories = Array.isArray(uiBatchData?.categories) 
      ? uiBatchData.categories 
      : []

    // Extract premium experiences and product showcase from side panels
    const sidePanels = uiBatchData?.sidePanels || {}
    const premiumExperiences = Array.isArray(sidePanels?.premium) ? sidePanels.premium : []
    const productShowcase = Array.isArray(sidePanels?.showcase) ? sidePanels.showcase : []

    // Fetch additional carousel data (contact CTA slides) from original source
    // This can also be migrated to the unified batch API in future
    const contactCTASlides = await getContactCTASlides().catch(() => [])

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
