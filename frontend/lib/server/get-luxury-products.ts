import type { Product } from "@/types"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://mizizzi-ecommerce-1.onrender.com"

// Default seller information
const defaultSeller = {
  id: 1,
  name: "Mizizzi Store",
  rating: 4.8,
  verified: true,
  store_name: "Mizizzi Official Store",
  logo_url: "/logo.png",
}

function extractProducts(payload: any): Product[] {
  const data = payload?.data ?? payload
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.products)) return data.products
  if (Array.isArray(data?.data)) return data.data
  return []
}

function normalizeProductPrices(product: Product): Product {
  let price = product.price
  let salePrice = product.sale_price

  // Convert string prices to numbers
  if (typeof price === "string") {
    price = Number.parseFloat(price) || 0
  }
  if (typeof salePrice === "string") {
    salePrice = Number.parseFloat(salePrice) || null
  }

  return {
    ...product,
    price: price || 0,
    sale_price: salePrice || null,
  }
}

/**
 * Server-side function to fetch luxury deal products
 * This runs on the server before the page is sent to the browser
 * Similar to how Jumia pre-renders products for instant display
 */
export async function getLuxuryProducts(limit = 12): Promise<Product[]> {
  try {
    // Try fetching luxury products first
    const url = `${API_BASE_URL}/api/products/?is_luxury=true&per_page=${limit}`

    const response = await fetch(url, {
      next: {
        revalidate: 60, // Cache for 60 seconds on the server
        tags: ["luxury-deals"], // Tag for on-demand revalidation
      },
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      console.error(`[SSR] Failed to fetch luxury products: ${response.status}`)
      // Fallback to high-priced products
      return await getFallbackLuxuryProducts(limit)
    }

    const data = await response.json()
    let products: Product[] = extractProducts(data)

    // Filter for luxury products (double-check)
    products = products.filter((p) => Boolean((p as any).is_luxury))

    // If no luxury products found, get fallback
    if (products.length === 0) {
      return await getFallbackLuxuryProducts(limit)
    }

    // Normalize and enhance products
    const enhancedProducts = products.map((product) => {
      product = normalizeProductPrices(product)

      return {
        ...product,
        seller: product.seller || defaultSeller,
        product_type: "luxury" as const,
      }
    })

    return enhancedProducts
  } catch (error) {
    console.error("[SSR] Error fetching luxury products:", error)
    return await getFallbackLuxuryProducts(limit)
  }
}

/**
 * Fallback function to get high-priced products as luxury items
 */
async function getFallbackLuxuryProducts(limit = 12): Promise<Product[]> {
  try {
    const url = `${API_BASE_URL}/api/products/?per_page=${limit}&sort_by=price&sort_order=desc`

    const response = await fetch(url, {
      next: {
        revalidate: 60,
        tags: ["luxury-deals-fallback"],
      },
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    const products: Product[] = extractProducts(data)

    // Normalize and enhance products
    const enhancedProducts = products.map((product) => {
      product = normalizeProductPrices(product)

      return {
        ...product,
        seller: product.seller || defaultSeller,
        product_type: "luxury" as const,
      }
    })

    return enhancedProducts
  } catch (error) {
    console.error("[SSR] Error fetching fallback luxury products:", error)
    return []
  }
}
