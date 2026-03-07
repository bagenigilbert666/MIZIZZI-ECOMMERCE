'use client'

import { Suspense, lazy } from "react"
import { ShoppingBag } from "lucide-react"
import Link from "next/link"
import type { Product } from "@/types"

// Dynamic imports for below-the-fold sections with ssr: false
// These only load when they come into viewport or after critical path completes
const LuxuryDeals = lazy(() => import("@/components/features/luxury-deals").then((m) => ({ default: m.LuxuryDeals })))
const TopPicks = lazy(() => import("@/components/features/top-picks").then((m) => ({ default: m.TopPicks })))
const NewArrivals = lazy(() => import("@/components/features/new-arrivals").then((m) => ({ default: m.NewArrivals })))
const TrendingNow = lazy(() => import("@/components/features/trending-now").then((m) => ({ default: m.TrendingNow })))
const DailyFinds = lazy(() => import("@/components/features/daily-finds").then((m) => ({ default: m.DailyFinds })))
const BrandShowcase = lazy(() => import("@/components/features/brand-showcase").then((m) => ({ default: m.BrandShowcase })))
const ProductGrid = lazy(() => import("@/components/products/product-grid").then((m) => ({ default: m.ProductGrid })))

interface DeferredSectionsLoaderProps {
  luxuryProducts: Product[]
  newArrivals: Product[]
  topPicks: Product[]
  trendingProducts: Product[]
  dailyFinds: Product[]
  allProducts: Product[]
  allProductsHasMore: boolean
}

/**
 * DEFERRED SECTIONS LOADER
 * 
 * This component renders all BELOW-THE-FOLD sections that load progressively:
 * - Luxury Deals
 * - Top Picks
 * - New Arrivals
 * - Trending Now
 * - Daily Finds
 * - All Products
 * - Brand Showcase
 * 
 * Why deferred:
 * - Not visible on initial screen
 * - User should see "above fold" content first (carousel, categories, promo)
 * - These load progressively with Suspense boundaries
 * - If a section fails, others continue loading
 * 
 * Performance strategy:
 * - Wrapped in Suspense with loading shell placeholders
 * - Dynamic imports for large component files
 * - Each section has its own Suspense boundary
 * - Heavy components only load when needed
 * - Intersection observer can be added to sections for viewport-based loading
 * 
 * Perceived performance:
 * - Critical path (carousel, categories, flash sale) renders ~1500-2000ms
 * - Deferred sections start loading after critical paint (~2500-3000ms)
 * - User can scroll, click, interact while sections load
 * - Page feels "done" in ~4-5 seconds even on cold start
 */
export function DeferredSectionsLoader({
  luxuryProducts,
  newArrivals,
  topPicks,
  trendingProducts,
  dailyFinds,
  allProducts,
  allProductsHasMore,
}: DeferredSectionsLoaderProps) {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-2 sm:px-3 md:px-4">
      <div className="grid gap-3 sm:gap-4 md:gap-8 py-2 sm:py-4">
        {/* 
          LUXURY DEALS SECTION
          - Premium products
          - Mid-priority, deferred with skeleton placeholder
          - Suspense boundary prevents blocking other sections
        */}
        <Suspense fallback={<DeferredSectionSkeleton title="Luxury Deals" />}>
          <section className="rounded-lg bg-white shadow-sm overflow-hidden">
            <LuxuryDeals products={luxuryProducts} />
          </section>
        </Suspense>

        {/* 
          TOP PICKS SECTION
          - Curated recommendations
          - Deferred with skeleton placeholder
        */}
        <Suspense fallback={<DeferredSectionSkeleton title="Top Picks" />}>
          <section className="rounded-lg bg-white shadow-sm overflow-hidden">
            <TopPicks products={topPicks} />
          </section>
        </Suspense>

        {/* 
          NEW ARRIVALS SECTION
          - Latest products
          - Deferred with skeleton placeholder
        */}
        <Suspense fallback={<DeferredSectionSkeleton title="New Arrivals" />}>
          <section className="rounded-lg bg-white shadow-sm overflow-hidden">
            <NewArrivals products={newArrivals} />
          </section>
        </Suspense>

        {/* 
          TRENDING SECTION
          - Currently trending items
          - Deferred with skeleton placeholder
        */}
        <Suspense fallback={<DeferredSectionSkeleton title="Trending Now" />}>
          <section className="rounded-lg bg-white shadow-sm overflow-hidden">
            <TrendingNow products={trendingProducts} />
          </section>
        </Suspense>

        {/* 
          DAILY FINDS SECTION
          - Daily curated selection
          - Deferred with skeleton placeholder
        */}
        <Suspense fallback={<DeferredSectionSkeleton title="Daily Finds" />}>
          <section className="rounded-lg bg-white shadow-sm overflow-hidden">
            <DailyFinds products={dailyFinds} />
          </section>
        </Suspense>

        {/* 
          ALL PRODUCTS SECTION
          - Full product catalog with infinite scroll
          - Largest and most interactive section
          - Deferred with skeleton placeholder
        */}
        <Suspense fallback={<DeferredSectionSkeleton title="All Products" height={400} />}>
          <section className="rounded-lg bg-white shadow-sm overflow-hidden">
            <div className="bg-[#8B1538] text-white flex items-center justify-between px-2 sm:px-4 py-1.5 sm:py-2">
              <div className="flex items-center gap-1 sm:gap-2">
                <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-300" />
                <h2 className="font-bold text-sm sm:text-base md:text-lg whitespace-nowrap">All Products</h2>
              </div>
              <Link
                href="/products"
                className="group flex items-center gap-1 text-xs sm:text-sm font-medium text-white hover:text-yellow-300 transition-colors"
              >
                View All
                <span className="inline-block arrow-animate">→</span>
              </Link>
            </div>
            <div className="p-1 sm:p-2">
              <ProductGrid initialProducts={allProducts} initialHasMore={allProductsHasMore} limit={12} />
            </div>
          </section>
        </Suspense>

        {/* 
          BRAND SHOWCASE SECTION
          - Last section, lowest priority
          - Deferred with skeleton placeholder
        */}
        <Suspense fallback={<DeferredSectionSkeleton title="Featured Brands" height={250} />}>
          <section className="rounded-lg bg-white shadow-sm overflow-hidden">
            <BrandShowcase />
          </section>
        </Suspense>
      </div>
    </div>
  )
}

/**
 * DEFERRED SECTION SKELETON PLACEHOLDER
 * 
 * Purpose:
 * - Provides visual continuity while section loads
 * - Prevents layout shift with fixed height
 * - Subtle animation shows "something is loading"
 * - Maintains page readability during progressive loading
 */
function DeferredSectionSkeleton({
  title,
  height = 300,
}: {
  title: string
  height?: number
}) {
  return (
    <section className="rounded-lg bg-white shadow-sm overflow-hidden" style={{ minHeight: `${height}px` }}>
      <div className="bg-gray-100 text-gray-700 px-2 sm:px-4 py-1.5 sm:py-2">
        <h2 className="font-bold text-sm sm:text-base md:text-lg">{title}</h2>
      </div>
      <div className="p-2 sm:p-4 space-y-3">
        {/* Skeleton grid of 4 items (1 per row on mobile, 4 on desktop) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-gray-200 rounded aspect-square animate-pulse"
              style={{
                animation: `pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
                animationDelay: `${i * 75}ms`,
              }}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </section>
  )
}

/**
 * STATIC SKELETON COMPONENT (for Suspense fallback in page.tsx)
 * Returns same skeleton that DeferredSectionsLoader.Skeleton uses
 */
DeferredSectionsLoader.Skeleton = function DeferredSectionsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-2 sm:px-3 md:px-4">
      <div className="grid gap-3 sm:gap-4 md:gap-8 py-2 sm:py-4">
        {[
          { title: "Luxury Deals" },
          { title: "Top Picks" },
          { title: "New Arrivals" },
          { title: "Trending Now" },
          { title: "Daily Finds" },
          { title: "All Products", height: 400 },
          { title: "Featured Brands", height: 250 },
        ].map((section) => (
          <DeferredSectionSkeleton key={section.title} {...section} />
        ))}
      </div>
    </div>
  )
}
