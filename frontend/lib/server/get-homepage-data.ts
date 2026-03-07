/**
 * Frontend homepage data fetcher - Single unified call to batch homepage endpoint.
 */
import { cache } from "react"

// Priority: NEXT_PUBLIC_API_URL (Render) > NEXT_PUBLIC_API_BASE_URL > localhost fallback
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000"

// Debug log to verify correct URL is being used
console.log("[v0] Homepage API URL:", API_BASE_URL)

/**
 * Get all homepage data in a single batch request.
 *
 * Architecture:
 * - Single API call to /api/homepage instead of 13 separate calls
 * - Returns all homepage sections in parallel
 * - Reuses per-section Redis caching from backend
 * - ISR revalidate: 60s for freshness
 *
 * Returns:
 *   {
 *     categories: Category[]
 *     carousel_items: CarouselItem[]
 *     flash_sale_products: Product[]
 *     luxury_products: Product[]
 *     new_arrivals: Product[]
 *     top_picks: Product[]
 *     trending_products: Product[]
 *     daily_finds: Product[]
 *     all_products: { products: Product[], has_more: boolean, total: number, page: number }
 *   }
 */
export const getHomepageData = cache(async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/homepage`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      // Revalidate every 60 seconds
      next: { revalidate: 60, tags: ["homepage"] },
    })

    if (!response.ok) {
      console.error(`[Homepage] Failed to fetch: ${response.status}`)
      return getHomepageDataFallback()
    }

    const result = await response.json()

    // Log cache header for debugging
    const cacheHeader = response.headers.get("X-Cache")
    if (cacheHeader) {
      console.debug(`[Homepage] Cache: ${cacheHeader}`)
    }

    if (result.status === "success" && result.data) {
      return result.data
    }

    return getHomepageDataFallback()
  } catch (error) {
    console.error("[Homepage] Fetch error:", error)
    return getHomepageDataFallback()
  }
})

/**
 * Safe fallback structure when API is unavailable.
 * HomeContent component handles empty arrays gracefully.
 */
function getHomepageDataFallback() {
  return {
    categories: [],
    carousel_items: [],
    flash_sale_products: [],
    luxury_products: [],
    new_arrivals: [],
    top_picks: [],
    trending_products: [],
    daily_finds: [],
    all_products: {
      products: [],
      has_more: false,
      total: 0,
      page: 1,
    },
  }
}
