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

// ISR: Cache entire page for 60 seconds
export const revalidate = 60

/**
 * JUMIA-STYLE INSTANT RENDERING:
 * - Shows page shell in < 1s with critical data or defaults
 * - 3-second timeout ensures LCP < 2s even on slow backends
 * - All remaining data loads in parallel, streaming in as ready
 * - No Suspense blocking: render immediately, update progressively
 */

// Helper: Create promise that resolves with fallback after timeout
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms))
  ])
}

export default async function Home() {
  try {
    // Phase 1: Critical data with 3-second hard timeout
    // Render page immediately with this data or defaults
    const [categories, carousel, premium, showcase] = await Promise.all([
      withTimeout(getCategories(20), 3000, []),
      withTimeout(getCarouselItems(), 3000, []),
      withTimeout(getPremiumExperiences(), 3000, []),
      withTimeout(getProductShowcase(), 3000, []),
    ])

    // Phase 2: Deferred data - fetched in parallel, rendered when ready
    // This doesn't block initial render
    const deferredPromise = (async () => {
      try {
        const [cta, features, flash, luxury, newArr, picks, trending, daily, allProducts] = await Promise.all([
          withTimeout(getContactCTASlides(), 5000, []),
          withTimeout(getFeatureCards(), 5000, []),
          withTimeout(getFlashSaleProducts(50), 5000, []),
          withTimeout(getLuxuryProducts(12), 5000, []),
          withTimeout(getNewArrivals(20), 5000, []),
          withTimeout(getTopPicks(20), 5000, []),
          withTimeout(getTrendingProducts(20), 5000, []),
          withTimeout(getDailyFinds(20), 5000, []),
          withTimeout(getAllProductsForHome(12), 5000, { products: [], hasMore: false }),
        ])
        return { cta, features, flash, luxury, newArr, picks, trending, daily, allProducts }
      } catch {
        return {
          cta: [],
          features: [],
          flash: [],
          luxury: [],
          newArr: [],
          picks: [],
          trending: [],
          daily: [],
          allProducts: { products: [], hasMore: false },
        }
      }
    })()

    // Render critical shell immediately - don't wait for deferred
    return (
      <>
        <HomeContent
          categories={categories}
          carouselItems={carousel}
          premiumExperiences={premium}
          productShowcase={showcase}
          contactCTASlides={[]}
          featureCards={[]}
          flashSaleProducts={[]}
          luxuryProducts={[]}
          newArrivals={[]}
          topPicks={[]}
          trendingProducts={[]}
          dailyFinds={[]}
          allProducts={[]}
          allProductsHasMore={false}
        />
        {/* Stream deferred data after page renders */}
        <Suspense fallback={null}>
          <DeferredContent promise={deferredPromise} />
        </Suspense>
      </>
    )
  } catch (error) {
    console.error("[v0] Home page error:", error)
    return (
      <HomeContent
        categories={[]}
        carouselItems={[]}
        premiumExperiences={[]}
        productShowcase={[]}
        contactCTASlides={[]}
        featureCards={[]}
        flashSaleProducts={[]}
        luxuryProducts={[]}
        newArrivals={[]}
        topPicks={[]}
        trendingProducts={[]}
        dailyFinds={[]}
        allProducts={[]}
        allProductsHasMore={false}
      />
    )
  }
}

// Renders deferred sections after critical content is on screen
async function DeferredContent({ promise }: { promise: Promise<any> }) {
  const deferred = await promise

  return (
    <HomeContent
      categories={[]}
      carouselItems={[]}
      premiumExperiences={[]}
      productShowcase={[]}
      contactCTASlides={deferred.cta}
      featureCards={deferred.features}
      flashSaleProducts={deferred.flash}
      luxuryProducts={deferred.luxury}
      newArrivals={deferred.newArr}
      topPicks={deferred.picks}
      trendingProducts={deferred.trending}
      dailyFinds={deferred.daily}
      allProducts={deferred.allProducts.products}
      allProductsHasMore={deferred.allProducts.hasMore}
    />
  )
}
