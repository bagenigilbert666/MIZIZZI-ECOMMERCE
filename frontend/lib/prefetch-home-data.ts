// Prefetch critical home page data for instant loading
import { prefetchFlashSales } from "@/hooks/use-swr-flash-sales"
import { prefetchLuxuryDeals } from "@/hooks/use-swr-luxury-deals"
import { prefetchNewArrivals } from "@/hooks/use-swr-new-arrivals"
import { prefetchDailyFinds } from "@/hooks/use-swr-daily-finds"
import { prefetchTopPicks } from "@/hooks/use-swr-top-picks"
import { prefetchTrending } from "@/hooks/use-swr-trending"
import { prefetchProductGrid } from "@/hooks/use-swr-product-grid"
import { eagerPrefetchProducts } from "@/lib/cache/products-quick-fetch"

let prefetchPromise: Promise<void> | null = null

export async function prefetchHomeData(): Promise<void> {
  // Prevent multiple concurrent prefetch calls
  if (prefetchPromise) {
    return prefetchPromise
  }

  prefetchPromise = (async () => {
    try {
      // Run ALL prefetches in parallel for fastest loading
      // This ensures Top Picks, Trending, New Arrivals, and Daily Finds
      // load just as fast as Flash Sales and Luxury Deals
      await Promise.all([
        prefetchFlashSales(),
        eagerPrefetchProducts({ flash_sale: true, limit: 50 }),
        prefetchLuxuryDeals(),
        prefetchTopPicks(),
        prefetchNewArrivals(),
        prefetchTrending(),
        prefetchDailyFinds(),
        prefetchProductGrid(12), // Prefetch product grid with default limit
      ])

      console.log("[v0] All home data prefetched successfully")
    } catch (error) {
      console.warn("[v0] Failed to prefetch home data:", error)
    }
  })()

  return prefetchPromise
}

// Check if prefetch has been initiated
export function isPrefetchInitiated(): boolean {
  return prefetchPromise !== null
}

// Reset prefetch state (useful for testing)
export function resetPrefetch(): void {
  prefetchPromise = null
}
