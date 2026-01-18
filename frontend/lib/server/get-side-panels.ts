import { cache } from "react"

export interface PanelItem {
  id: number
  title: string
  metric: string
  description: string
  icon_name: string
  image: string
  gradient: string
  features: string[]
  is_active: boolean
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "https://mizizzi-ecommerce-1.onrender.com"

const DEFAULT_PRODUCT_SHOWCASE: PanelItem[] = [
  {
    id: 1,
    title: "NEW ARRIVALS",
    metric: "50+",
    description: "Products",
    icon_name: "Sparkles",
    image: "",
    gradient: "from-primary to-primary/80",
    features: ["Premium quality", "Latest trends"],
    is_active: true,
  },
]

const DEFAULT_PREMIUM_EXPERIENCE: PanelItem[] = [
  {
    id: 1,
    title: "PREMIUM MEMBERSHIP",
    metric: "98.7%",
    description: "Satisfaction",
    icon_name: "Award",
    image: "",
    gradient: "from-amber-400 to-orange-500",
    features: ["Priority support", "Exclusive deals"],
    is_active: true,
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

export const getProductShowcase = cache(async (): Promise<PanelItem[]> => {
  try {
    const data = await fetchWithTimeout(
      `${API_BASE_URL}/api/panels/items?panel_type=product_showcase&position=left`,
      { next: { revalidate: 300 } },
      2000,
      { items: [] },
    )

    if (data.items && data.items.length > 0) {
      return data.items.map((item: any) => ({
        id: item.id,
        title: item.title || "",
        metric: item.metric || "",
        description: item.description || "",
        icon_name: item.icon_name || "Gem",
        image: item.image_url || "",
        gradient: item.gradient || "from-primary to-primary/80",
        features: item.features || [],
        is_active: item.is_active ?? true,
      }))
    }

    return DEFAULT_PRODUCT_SHOWCASE
  } catch (error) {
    return DEFAULT_PRODUCT_SHOWCASE
  }
})

export const getPremiumExperience = cache(async (): Promise<PanelItem[]> => {
  try {
    const data = await fetchWithTimeout(
      `${API_BASE_URL}/api/panels/items?panel_type=premium_experience&position=right`,
      { next: { revalidate: 300 } },
      2000,
      { items: [] },
    )

    if (data.items && data.items.length > 0) {
      return data.items.map((item: any) => ({
        id: item.id,
        title: item.title || "",
        metric: item.metric || "",
        description: item.description || "",
        icon_name: item.icon_name || "Award",
        image: item.image_url || "",
        gradient: item.gradient || "from-amber-400 to-orange-500",
        features: item.features || [],
        is_active: item.is_active ?? true,
      }))
    }

    return DEFAULT_PREMIUM_EXPERIENCE
  } catch (error) {
    return DEFAULT_PREMIUM_EXPERIENCE
  }
})
