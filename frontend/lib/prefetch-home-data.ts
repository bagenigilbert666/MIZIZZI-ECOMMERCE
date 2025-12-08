// Prefetch critical home page data for instant loading
import { prefetchFlashSales } from "@/hooks/use-swr-flash-sales"
import { prefetchLuxuryDeals } from "@/hooks/use-swr-luxury-deals"
import { prefetchNewArrivals } from "@/hooks/use-swr-new-arrivals"
import { prefetchDailyFinds } from "@/hooks/use-swr-daily-finds"
import { prefetchTopPicks } from "@/hooks/use-swr-top-picks"
import { prefetchTrending } from "@/hooks/use-swr-trending"

let prefetchPromise: Promise<void> | null = null
let secondaryPrefetchPromise: Promise<void> | null = null

// Call this once on app initialization to prefetch critical data
export async function prefetchHomeData(): Promise<void> {
  // Prevent multiple concurrent prefetch calls
  if (prefetchPromise) {
    return prefetchPromise
  }

  prefetchPromise = (async () => {
    try {
      // Priority 1: Prefetch above-the-fold content first (Flash Sales, Luxury Deals)
      await Promise.all([prefetchFlashSales(), prefetchLuxuryDeals()])

      // Priority 2: Prefetch remaining sections in background (non-blocking)
      secondaryPrefetchPromise = Promise.all([
        prefetchTopPicks(),
        prefetchNewArrivals(),
        prefetchTrending(),
        prefetchDailyFinds(),
      ])
        .then(() => {
          console.log("[v0] Secondary home data prefetched successfully")
        })
        .catch((error) => {
          console.warn("[v0] Failed to prefetch secondary home data:", error)
        })

      console.log("[v0] Primary home data prefetched successfully")
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
  secondaryPrefetchPromise = null
}
