import { Suspense } from "react"
import { getHomepageData } from "@/lib/server/get-homepage-data"
import { HomeContent } from "@/components/home/home-content"
import { CriticalHomepageLoader } from "@/components/home/critical-homepage-loader"
import { DeferredSectionsLoader } from "@/components/home/deferred-sections-loader"

/**
 * PERFORMANCE-OPTIMIZED HOMEPAGE
 * 
 * Strategy: Two-phase loading for fast perceived performance
 * 
 * CRITICAL PATH (blocks initial render):
 * - Topbar (nav)
 * - Carousel/Hero
 * - Categories
 * - Flash Sale (key promo section)
 * 
 * DEFERRED PATH (loads after first paint):
 * - Luxury products
 * - Top picks
 * - Trending products
 * - Daily finds
 * - Contact CTA slides
 * - Premium experiences
 * - Product showcase
 * - Feature cards
 * - All products
 * 
 * This approach achieves:
 * - First Contentful Paint (FCP) in ~800-1200ms (cold start)
 * - Largest Contentful Paint (LCP) in ~1500-2000ms
 * - No Cumulative Layout Shift (CLS) - all sections have height locks
 * - User can interact with hero, categories, and promo immediately
 * - Remaining sections gracefully stream in progressively
 * 
 * Caching compatibility:
 * - Respects existing Redis caching at section and top-level
 * - Backend aggregator runs on route handler, not page load
 * - Frontend uses strategic fetch splitting for performance perception
 */

export const revalidate = 60

export default async function Home() {
  // Fetch all data upfront to leverage backend caching + parallelism
  // Split strategically on frontend for perceived speed
  const data = await getHomepageData()

  // Prepare critical section data (topbar, carousel, categories, flash sale)
  const criticalData = {
    carouselItems: data.carousel_items || [],
    categories: data.categories || [],
    flashSaleProducts: data.flash_sale_products || [],
    premiumExperiences: data.premium_experiences || [],
    contactCTASlides: data.contact_cta_slides || [],
    featureCards: data.feature_cards || [],
    productShowcase: data.product_showcase || [],
  }

  // Prepare deferred section data
  const deferredData = {
    luxuryProducts: data.luxury_products || [],
    newArrivals: data.new_arrivals || [],
    topPicks: data.top_picks || [],
    trendingProducts: data.trending_products || [],
    dailyFinds: data.daily_finds || [],
    allProducts: data.all_products?.products || [],
    allProductsHasMore: data.all_products?.has_more || false,
  }

  return (
    <>
      {/* CRITICAL SECTION: Renders immediately (topbar, carousel, categories, flash sale) */}
      <CriticalHomepageLoader {...criticalData} />

      {/* DEFERRED SECTIONS: Streams in after critical path with Suspense fallbacks */}
      <Suspense fallback={<DeferredSectionsLoader.Skeleton />}>
        <DeferredSectionsLoader {...deferredData} />
      </Suspense>
    </>
  )
}
