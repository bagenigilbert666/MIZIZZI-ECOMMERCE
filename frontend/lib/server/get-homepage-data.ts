import { cache } from "react"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://mizizzi-ecommerce-1.onrender.com"

/**
 * CRITICAL DATA FETCH - Fast path for above-the-fold sections only
 * 
 * Fetches only 4 critical sections:
 * - categories
 * - carousel_items
 * - flash_sale_products
 * 
 * Performance:
 * - Cold start: ~300-800ms (3 fast DB queries)
 * - Warm start (cached): <50ms
 * - Much faster than full homepage endpoint
 * 
 * This fetch should happen BEFORE deferred sections for true staged loading.
 */
export const getCriticalHomepageData = cache(async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/homepage/critical`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      next: { revalidate: 120, tags: ["homepage-critical"] },
    })

    if (!response.ok) {
      console.error(`[Homepage Critical] API response not ok: ${response.status}`)
      return getCriticalHomepageDataFallback()
    }

    const result = await response.json()

    if (result.status === "success" && result.data) {
      return result.data
    }

    console.error("[Homepage Critical] Unexpected response structure:", JSON.stringify(result).slice(0, 200))
    return getCriticalHomepageDataFallback()
  } catch (error) {
    console.error("[Homepage Critical] Fetch error:", error)
    return getCriticalHomepageDataFallback()
  }
})

function getCriticalHomepageDataFallback() {
  return {
    categories: [],
    carousel_items: [],
    flash_sale_products: [],
  }
}

/**
 * FULL HOMEPAGE DATA FETCH - Complete data for all sections
 * 
 * Fetches all 13 sections in parallel (backend aggregator handles parallelism).
 * 
 * Performance:
 * - Cold start: ~3-5s (full backend aggregation)
 * - Warm start (cached): <50ms
 * 
 * Use Case:
 * - Deferred loading: Fetch this AFTER critical sections render
 * - Progressive rendering: Page already interactive from critical data
 * - Backward compatibility: Works exactly like original implementation
 */
export const getHomepageData = cache(async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/homepage`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      next: { revalidate: 60, tags: ["homepage"] },
    })

    if (!response.ok) {
      console.error(`[Homepage] API response not ok: ${response.status}`)
      return getHomepageDataFallback()
    }

    const result = await response.json()

    if (result.status === "success" && result.data) {
      return result.data
    }

    console.error("[Homepage] Unexpected response structure:", JSON.stringify(result).slice(0, 200))
    return getHomepageDataFallback()
  } catch (error) {
    console.error("[Homepage] Fetch error:", error)
    return getHomepageDataFallback()
  }
})

function getHomepageDataFallback() {
  return {
    categories: [],
    carousel_items: [],
    contact_cta_slides: [],
    daily_finds: [],
    feature_cards: [],
    flash_sale_products: [],
    luxury_products: [],
    new_arrivals: [],
    premium_experiences: [],
    product_showcase: [],
    top_picks: [],
    trending_products: [],
    all_products: {
      products: [],
      has_more: false,
      total: 0,
      page: 1,
    },
  }
}
