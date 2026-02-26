import { Suspense } from "react"
import { getCarouselItems, getPremiumExperiences, getProductShowcase, getContactCTASlides, getFeatureCards } from "@/lib/server/get-carousel-data"
import { getCategories } from "@/lib/server/get-categories"
import { HomeContent } from "@/components/home/home-content"

// ISR revalidation - revalidate every 60 seconds for fresh content
export const revalidate = 60

/**
 * OPTIMIZED HOMEPAGE: Hybrid critical/deferred approach
 * Critical: Carousel, categories, premium experiences, product showcase, CTA slides (visible immediately)
 * Deferred: Feature cards, flash sales, luxury, new arrivals, top picks, trending, daily finds
 */

// CRITICAL PATH: Essential data needed for initial viewport
async function CriticalPath() {
  try {
    const [categories, carouselItems, premiumExperiences, productShowcase, contactCTASlides] = await Promise.all([
      getCategories(20),
      getCarouselItems(),
      getPremiumExperiences(),
      getProductShowcase(),
      getContactCTASlides(),
    ])
    return { categories, carouselItems, premiumExperiences, productShowcase, contactCTASlides }
  } catch (error) {
    console.error("[v0] Critical path error:", error)
    return { categories: [], carouselItems: [], premiumExperiences: [], productShowcase: [], contactCTASlides: [] }
  }
}

// DEFERRED DATA LOADER: Loads deferred content separately
async function DeferredDataLoader() {
  try {
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
      (async () => {
        const { getFeatureCards } = await import("@/lib/server/get-carousel-data")
        return getFeatureCards()
      })(),
      (async () => {
        const { getFlashSaleProducts } = await import("@/lib/server/get-flash-sale-products")
        return getFlashSaleProducts(50)
      })(),
      (async () => {
        const { getLuxuryProducts } = await import("@/lib/server/get-luxury-products")
        return getLuxuryProducts(12)
      })(),
      (async () => {
        const { getNewArrivals } = await import("@/lib/server/get-new-arrivals")
        return getNewArrivals(20)
      })(),
      (async () => {
        const { getTopPicks } = await import("@/lib/server/get-top-picks")
        return getTopPicks(20)
      })(),
      (async () => {
        const { getTrendingProducts } = await import("@/lib/server/get-trending-products")
        return getTrendingProducts(20)
      })(),
      (async () => {
        const { getDailyFinds } = await import("@/lib/server/get-daily-finds")
        return getDailyFinds(20)
      })(),
      (async () => {
        const { getAllProductsForHome } = await import("@/lib/server/get-all-products")
        return getAllProductsForHome(12)
      })(),
    ])
    
    return {
      featureCards,
      flashSaleProducts,
      luxuryProducts,
      newArrivals,
      topPicks,
      trendingProducts,
      dailyFinds,
      allProducts: allProductsData.products,
      allProductsHasMore: allProductsData.hasMore,
    }
  } catch (error) {
    console.error("[v0] Deferred data error:", error)
    return {
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

async function DeferredContent() {
  const deferred = await DeferredDataLoader()
  return deferred
}

export default async function Home() {
  const critical = await CriticalPath()
  
  return (
    <>
      <Suspense fallback={null}>
        <HomePageContent critical={critical} />
      </Suspense>
    </>
  )
}

async function HomePageContent({ critical }: { critical: Awaited<ReturnType<typeof CriticalPath>> }) {
  const deferred = await DeferredContent()

  return (
    <HomeContent
      categories={critical.categories}
      carouselItems={critical.carouselItems}
      premiumExperiences={critical.premiumExperiences}
      productShowcase={critical.productShowcase}
      contactCTASlides={critical.contactCTASlides}
      featureCards={deferred.featureCards}
      flashSaleProducts={deferred.flashSaleProducts}
      luxuryProducts={deferred.luxuryProducts}
      newArrivals={deferred.newArrivals}
      topPicks={deferred.topPicks}
      trendingProducts={deferred.trendingProducts}
      dailyFinds={deferred.dailyFinds}
      allProducts={deferred.allProducts}
      allProductsHasMore={deferred.allProductsHasMore}
    />
  )
}
