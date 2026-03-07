import { Suspense } from 'react'
import { DeferredSections } from '@/components/home/deferred-sections'
import { DeferredSectionsPlaceholder } from '@/components/home/section-placeholders'
import type { Product } from '@/types'

interface DeferredSectionWrapperProps {
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
 * Server component that wraps deferred sections with Suspense boundary.
 * Allows deferred sections to render progressively without blocking critical content.
 *
 * Architecture:
 * - Suspense fallback shows fixed-height placeholders (prevents CLS)
 * - DeferredSections uses dynamic imports + client-side rendering
 * - Data comes from existing API response (no second fetch)
 */
export function DeferredSectionWrapper({
  flashSaleProducts,
  luxuryProducts,
  newArrivals,
  topPicks,
  trendingProducts,
  dailyFinds,
  allProducts,
  allProductsHasMore,
}: DeferredSectionWrapperProps) {
  return (
    <Suspense fallback={<DeferredSectionsPlaceholder />}>
      <DeferredSections
        flashSaleProducts={flashSaleProducts}
        luxuryProducts={luxuryProducts}
        newArrivals={newArrivals}
        topPicks={topPicks}
        trendingProducts={trendingProducts}
        dailyFinds={dailyFinds}
        allProducts={allProducts}
        allProductsHasMore={allProductsHasMore}
      />
    </Suspense>
  )
}
