import { cache } from "react"

export interface CarouselItem {
  image: string
  title: string
  description: string
  buttonText: string
  href: string
  badge?: string
  discount?: string
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "https://mizizzi-ecommerce-1.onrender.com"

const DEFAULT_CAROUSEL_ITEMS: CarouselItem[] = [
  {
    image: "/images/hero-banner.jpg",
    title: "Welcome to Mizizzi Store",
    description: "Discover amazing products at great prices",
    buttonText: "Shop Now",
    href: "/products",
    badge: "NEW",
  },
]

async function fetchWithTimeout<T>(url: string, options: RequestInit, timeoutMs: number, fallback: T): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      return fallback
    }

    return await response.json()
  } catch (error) {
    clearTimeout(timeoutId)
    return fallback
  }
}

export const getCarouselItems = cache(async (): Promise<CarouselItem[]> => {
  try {
    const data = await fetchWithTimeout(
      `${API_BASE_URL}/api/carousel/items?position=homepage`,
      { next: { revalidate: 300 } },
      2000,
      { success: false, items: [] },
    )

    if (data.success && data.items && data.items.length > 0) {
      return data.items.map((item: any) => ({
        image: item.image_url || "",
        title: item.title || "",
        description: item.description || "",
        buttonText: item.button_text || "Shop Now",
        href: item.link_url || "/products",
        badge: item.badge_text,
        discount: item.discount,
      }))
    }

    return DEFAULT_CAROUSEL_ITEMS
  } catch (error) {
    return DEFAULT_CAROUSEL_ITEMS
  }
})
