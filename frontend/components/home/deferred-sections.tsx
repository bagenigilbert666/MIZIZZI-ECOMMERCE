'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import type { Product } from '@/types'
import { Suspense } from 'react'
import { SectionLoader } from './section-loader'

interface DeferredSectionsProps {
  flashSaleProducts: Product[]
  luxuryProducts: Product[]
  newArrivals: Product[]
  topPicks: Product[]
  trendingProducts: Product[]
  dailyFinds: Product[]
  allProducts: Product[]
  allProductsHasMore: boolean
}

/**
 * Deferred sections loaded with dynamic imports to avoid blocking page render.
 * Each section is code-split and lazy-loaded with Suspense.
 *
 * Includes:
 * - Flash Sales
 * - Luxury Deals
 * - Top Picks
 * - New Arrivals
 * - Trending Now
 * - Daily Finds
 * - All Products
 * - Brand Showcase
 */

// Dynamic imports with client-side rendering to defer loading until needed
const FlashSalesClient = dynamic(
  () => import('@/components/features/flash-sales-client').then(mod => mod.FlashSalesClient),
  { ssr: false }
)

const LuxuryDealsClient = dynamic(
  () => import('@/components/features/luxury-deals-client').then(mod => mod.LuxuryDealsClient),
  { ssr: false }
)

const TopPicksClient = dynamic(
  () => import('@/components/features/top-picks-client').then(mod => mod.TopPicksClient),
  { ssr: false }
)

const NewArrivalsClient = dynamic(
  () => import('@/components/features/new-arrivals-client').then(mod => mod.NewArrivalsClient),
  { ssr: false }
)

const TrendingNowClient = dynamic(
  () => import('@/components/features/trending-now-client').then(mod => mod.TrendingNowClient),
  { ssr: false }
)

const DailyFindsClient = dynamic(
  () => import('@/components/features/daily-finds-client').then(mod => mod.DailyFindsClient),
  { ssr: false }
)

const ProductGrid = dynamic(
  () => import('@/components/products/product-grid').then(mod => mod.ProductGrid),
  { ssr: false }
)

const BrandShowcase = dynamic(
  () => import('@/components/features/brand-showcase').then(mod => mod.BrandShowcase),
  { ssr: false }
)

export function DeferredSections({
  flashSaleProducts,
  luxuryProducts,
  newArrivals,
  topPicks,
  trendingProducts,
  dailyFinds,
  allProducts,
  allProductsHasMore,
}: DeferredSectionsProps) {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-2 sm:px-3 md:px-4">
      <div className="grid gap-3 sm:gap-4 md:gap-8 py-2 sm:py-4">
        {/* Flash Sales Section */}
        {flashSaleProducts && flashSaleProducts.length > 0 && (
          <Suspense fallback={<SectionLoader title="Flash Sales | Hot Deals!" height="h-80" />}>
            <section className="rounded-lg bg-white shadow-sm overflow-hidden">
              <FlashSalesClient initialProducts={flashSaleProducts as any} initialEvent={null} />
            </section>
          </Suspense>
        )}

        {/* Luxury Deals Section */}
        {luxuryProducts && luxuryProducts.length > 0 && (
          <Suspense fallback={<SectionLoader title="Luxury Deals | Premium Quality!" height="h-96" />}>
            <section className="rounded-lg bg-white shadow-sm overflow-hidden">
              <LuxuryDealsClient initialProducts={luxuryProducts} />
            </section>
          </Suspense>
        )}

        {/* Top Picks Section */}
        {topPicks && topPicks.length > 0 && (
          <Suspense fallback={<SectionLoader title="🔥 Top Picks For You" height="h-80" />}>
            <section className="rounded-lg bg-white shadow-sm overflow-hidden">
              <TopPicksClient initialProducts={topPicks} />
            </section>
          </Suspense>
        )}

        {/* New Arrivals Section */}
        {newArrivals && newArrivals.length > 0 && (
          <Suspense fallback={<SectionLoader title="✨ New Arrivals | Fresh Collection!" height="h-80" />}>
            <section className="rounded-lg bg-white shadow-sm overflow-hidden">
              <NewArrivalsClient initialProducts={newArrivals} />
            </section>
          </Suspense>
        )}

        {/* Trending Now Section */}
        {trendingProducts && trendingProducts.length > 0 && (
          <Suspense fallback={<SectionLoader title="📈 Trending Now" height="h-80" />}>
            <section className="rounded-lg bg-white shadow-sm overflow-hidden">
              <TrendingNowClient initialProducts={trendingProducts} />
            </section>
          </Suspense>
        )}

        {/* Daily Finds Section */}
        {dailyFinds && dailyFinds.length > 0 && (
          <Suspense fallback={<SectionLoader title="💎 Daily Finds" height="h-80" />}>
            <section className="rounded-lg bg-white shadow-sm overflow-hidden">
              <DailyFindsClient initialProducts={dailyFinds} />
            </section>
          </Suspense>
        )}

        {/* All Products Section */}
        {allProducts && allProducts.length > 0 && (
          <Suspense fallback={<SectionLoader title="All Products" height="h-full" />}>
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
        )}

        {/* Brand Showcase Section */}
        <Suspense fallback={<SectionLoader title="Official Stores" height="h-80" />}>
          <section className="rounded-lg bg-white shadow-sm overflow-hidden">
            <BrandShowcase />
          </section>
        </Suspense>
      </div>
    </div>
  )
}
