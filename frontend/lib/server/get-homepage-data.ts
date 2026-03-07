import { cache } from "react"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://mizizzi-ecommerce-1.onrender.com"

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
