// Handles fetching carousel data from the backend API

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://mizizzi-ecommerce-1.onrender.com"

export interface CarouselBannerDTO {
  id: number
  name: string
  title: string
  description: string
  badge_text: string
  discount: string
  button_text: string
  link_url: string
  image_url: string
  position: string
  is_active: boolean
  sort_order: number
}

export interface CarouselItem {
  id: number
  image: string
  title: string
  description: string
  buttonText: string
  href: string
  badge: string
  discount: string
}

export const carouselService = {
  /**
   * Fetch carousel items for a specific position
   * Falls back to empty array if API is unavailable
   */
  async getCarouselItems(position = "homepage"): Promise<CarouselItem[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/carousel/items?position=${position}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        next: { revalidate: 300 }, // Cache for 5 minutes
      })

      if (!response.ok) {
        console.warn(`[v0] Carousel API returned status ${response.status}, using fallback`)
        return []
      }

      const data = await response.json()

      if (!data.success || !data.items) {
        console.warn("[v0] Carousel API response missing items, using fallback")
        return []
      }

      // Transform API response to CarouselItem format
      return data.items.map((item: CarouselBannerDTO) => ({
        id: item.id,
        image: item.image_url,
        title: item.title,
        description: item.description,
        buttonText: item.button_text,
        href: item.link_url,
        badge: item.badge_text,
        discount: item.discount,
      }))
    } catch (error) {
      console.error("[v0] Error fetching carousel items:", error)
      return []
    }
  },

  /**
   * Get a single carousel item by ID
   */
  async getCarouselItem(itemId: number): Promise<CarouselItem | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/carousel/item/${itemId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        return null
      }

      const data = await response.json()

      if (!data.success || !data.item) {
        return null
      }

      const item = data.item as CarouselBannerDTO

      return {
        id: item.id,
        image: item.image_url,
        title: item.title,
        description: item.description,
        buttonText: item.button_text,
        href: item.link_url,
        badge: item.badge_text,
        discount: item.discount,
      }
    } catch (error) {
      console.error("[v0] Error fetching carousel item:", error)
      return null
    }
  },
}
