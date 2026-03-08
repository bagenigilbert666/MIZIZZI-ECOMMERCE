import { cache } from "react"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://mizizzi-ecommerce-1.onrender.com"

export const getHomepageData = cache(async () => {
  try {
    console.log("[Homepage] Fetching from:", `${API_BASE_URL}/api/homepage`)
    
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
    console.log("[Homepage] API Response status:", result.status)

    if (result.status === "success" && result.data) {
      console.log("[Homepage] Successfully loaded homepage data with sections:", 
        Object.keys(result.data).filter(k => result.data[k] && (Array.isArray(result.data[k]) ? result.data[k].length > 0 : true))
      )
      return result.data
    }

    console.error("[Homepage] Unexpected response structure:", JSON.stringify(result).slice(0, 200))
    return getHomepageDataFallback()
  } catch (error) {
    console.error("[Homepage] Fetch error:", error instanceof Error ? error.message : String(error))
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
