import api from "@/lib/api"

export interface Category {
  id: number
  name: string
  slug: string
  description?: string
  image_url?: string
  banner_url?: string
  is_featured?: boolean
  parent_id?: number | null
  subcategories?: Category[]
  parent?: Category | null
  products_count?: number
  sort_order?: number
  is_active?: boolean
}

// Create a cache for API responses with expiry
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 30 * 1000 // 30 seconds

// Helper to strip nullish values from params
function sanitizeParams<T extends Record<string, any>>(params: T): Partial<T> {
  const out: Record<string, any> = {}
  Object.keys(params || {}).forEach((key) => {
    const val = params[key]
    if (val !== null && val !== undefined) {
      out[key] = val
    }
  })
  return out as Partial<T>
}

const getBaseUrl = () => {
  return (
    process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "https://mizizzi-ecommerce-1.onrender.com"
  )
}

const normalizeImageUrl = (url: string | undefined | null): string | undefined => {
  if (!url) return undefined
  // Already absolute URL or data URL - return as is
  if (url.startsWith("http") || url.startsWith("data:")) return url
  // Relative URL starting with / - prepend base URL
  if (url.startsWith("/")) {
    return `${getBaseUrl()}${url}`
  }
  return url
}

const normalizeCategoryImages = (category: any): Category => {
  return {
    ...category,
    image_url: normalizeImageUrl(category.image_url),
    banner_url: normalizeImageUrl(category.banner_url),
    products_count: category.products_count ?? 0,
  }
}

const CATEGORIES_BASE = "/api/categories"

const isCacheValid = (cacheKey: string): boolean => {
  const cached = cache.get(cacheKey)
  if (!cached) return false
  return Date.now() - cached.timestamp < CACHE_TTL
}

export const categoryService = {
  async getCategories(params: Record<string, any> = {}, forceRefresh = false): Promise<Category[]> {
    try {
      const cleanParams = sanitizeParams({
        page: params.page || 1,
        per_page: params.per_page || 100,
        parent_id: params.parent_id !== undefined ? params.parent_id : undefined,
        ...params,
      })

      if (!("parent_id" in params)) {
        delete cleanParams.parent_id
      }

      delete (cleanParams as Record<string, any>).signal

      const cacheKey = `categories-${JSON.stringify(cleanParams)}`

      if (!forceRefresh && isCacheValid(cacheKey)) {
        console.log("[v0] Returning cached categories (still valid)")
        return cache.get(cacheKey)!.data
      }

      console.log("[v0] Fetching all categories from API with params:", cleanParams)

      const baseUrl = getBaseUrl()
      const timestamp = Date.now()
      const response = await api.get(`${baseUrl}${CATEGORIES_BASE}`, {
        params: { ...cleanParams, _t: timestamp },
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      })

      console.log("[v0] Categories API response received:", response.data)

      let data = response.data?.items ?? response.data ?? []

      if (data && typeof data === "object" && !Array.isArray(data) && data.categories) {
        data = data.categories
      }

      if (!Array.isArray(data)) {
        console.warn("[v0] Categories API returned non-array data:", data)
        data = []
      }

      data = data.map(normalizeCategoryImages)

      console.log(`[v0] Successfully fetched ${data.length} categories from database`)
      cache.set(cacheKey, { data, timestamp: Date.now() })
      return data
    } catch (error) {
      console.error("[v0] Error fetching categories:", error)
      return []
    }
  },

  async getFeaturedCategories(): Promise<Category[]> {
    return this.getCategories({ featured: true })
  },

  async getCategoryBySlug(slug: string): Promise<Category | null> {
    if (!slug) return null
    try {
      const cacheKey = `category-${slug}`
      if (cache.has(cacheKey)) return cache.get(cacheKey)!.data

      const response = await api.get(`${getBaseUrl()}${CATEGORIES_BASE}/slug/${encodeURIComponent(slug)}`)
      const data = response.data ?? null

      const normalizedData = data ? normalizeCategoryImages(data) : null

      cache.set(cacheKey, { data: normalizedData, timestamp: Date.now() })
      return normalizedData
    } catch (error) {
      console.error(`[v0] Error fetching category with slug ${slug}:`, error)
      return null
    }
  },

  async getSubcategories(parentId: number): Promise<Category[]> {
    try {
      const cacheKey = `subcategories-${parentId}`
      if (cache.has(cacheKey)) return cache.get(cacheKey)!.data

      const response = await api.get(`${getBaseUrl()}${CATEGORIES_BASE}`, {
        params: { parent_id: parentId },
      })
      let data = response.data?.items ?? response.data ?? []

      if (data && typeof data === "object" && !Array.isArray(data) && data.categories) {
        data = data.categories
      }

      if (!Array.isArray(data)) {
        console.warn("[v0] Subcategories API returned non-array data:", data)
        data = []
      }

      data = data.map(normalizeCategoryImages)

      cache.set(cacheKey, { data, timestamp: Date.now() })
      return data
    } catch (error) {
      console.error(`[v0] Error fetching subcategories for parent ${parentId}:`, error)
      return []
    }
  },

  async getRelatedCategories(categoryId: number): Promise<Category[]> {
    if (!categoryId && categoryId !== 0) return []
    const tryEndpoints = [
      `${CATEGORIES_BASE}/${encodeURIComponent(String(categoryId))}/related/`,
      `${CATEGORIES_BASE}/${encodeURIComponent(String(categoryId))}/related`,
      `${CATEGORIES_BASE}/related/`,
    ] as const

    for (const url of tryEndpoints.slice(0, 2)) {
      try {
        const res = await api.get(`${getBaseUrl()}${url}`)
        const items = res.data?.items ?? res.data ?? []
        if (Array.isArray(items)) return items.map(normalizeCategoryImages)
      } catch {
        // continue to next pattern
      }
    }

    try {
      const res = await api.get(`${getBaseUrl()}${tryEndpoints[2]}`, { params: { category_id: categoryId } })
      const items = res.data?.items ?? res.data ?? []
      return Array.isArray(items) ? items.map(normalizeCategoryImages) : []
    } catch (error) {
      console.warn("[v0] getRelatedCategories fallback failed:", error)
      return []
    }
  },

  clearCache() {
    console.log("[v0] Clearing category service cache")
    cache.clear()
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem("categories")
    }
  },
}
