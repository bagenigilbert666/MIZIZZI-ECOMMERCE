import type { Product } from "@/types"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://mizizzi-ecommerce-1.onrender.com"

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

export async function getNewArrivals(limit = 20): Promise<Product[]> {
  try {
    const url = `${API_BASE_URL}/api/products/?is_new_arrival=true&per_page=${limit}`

    const response = await fetch(url, {
      next: {
        revalidate: 60,
        tags: ["new-arrivals"],
      },
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      console.error(`[SSR] Failed to fetch new arrivals: ${response.status}`)
      return await getFallbackNewArrivals(limit)
    }

    const data = await response.json()
    let products: Product[] = extractProducts(data)

    products = products.filter((p) => p.is_new_arrival)

    if (products.length === 0) {
      return await getFallbackNewArrivals(limit)
    }

    const enhancedProducts = products.map((product) => {
      product = normalizeProductPrices(product)
      return {
        ...product,
        seller: product.seller || defaultSeller,
      } as Product
    })

    return enhancedProducts
  } catch (error) {
    console.error("[SSR] Error fetching new arrivals:", error)
    return await getFallbackNewArrivals(limit)
  }
}

async function getFallbackNewArrivals(limit = 20): Promise<Product[]> {
  try {
    const url = `${API_BASE_URL}/api/products/?per_page=${limit}&sort_by=created_at&sort_order=desc`

    const response = await fetch(url, {
      next: {
        revalidate: 60,
        tags: ["new-arrivals-fallback"],
      },
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) return []

    const data = await response.json()
    const products: Product[] = extractProducts(data)

    return products.map((product) => {
      product = normalizeProductPrices(product)
      return {
        ...product,
        seller: product.seller || defaultSeller,
      } as Product
    })
  } catch (error) {
    return []
  }
}
