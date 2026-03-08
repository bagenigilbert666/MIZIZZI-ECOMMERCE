import { DeferredSections } from '@/components/home/deferred-sections'
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
 * Renders deferred sections without any placeholders.
 * Uses dynamic imports + client-side rendering for code splitting.
 * 
 * Jumia-like behavior:
 * - Critical sections render immediately with real data
 * - Deferred sections load silently in background
 * - No skeleton UI, shimmer effects, or placeholder cards
 * - Only real Mizizzi data is shown when each section is ready
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
  )
}
