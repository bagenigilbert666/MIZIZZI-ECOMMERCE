import { cache } from 'react'

/**
 * Unified UI Batch Data Function
 * 
 * Single server-side function that fetches carousel, topbar, categories, and side panels
 * using the new unified backend batch API endpoint.
 * 
 * This function:
 * - Uses React cache() for request deduplication within a single render
 * - Implements Next.js ISR (Incremental Static Regeneration) with 60s revalidate
 * - Provides type-safe interfaces for all component data
 * - Handles errors gracefully with sensible defaults
 * - Optimizes performance by making a single HTTP request instead of multiple
 */

// Type definitions for carousel items
export interface CarouselItem {
  image: string
  title: string
  description: string
  buttonText: string
  href: string
  badge?: string
  discount?: string
}

// Type definitions for topbar items (navigation, search, etc.)
export interface TopbarItem {
  id: number
  title: string
  slug?: string
  content?: string
  icon?: string
  order?: number
  is_active?: boolean
}

// Type definitions for categories
export interface Category {
  id: number
  name: string
  slug: string
  description?: string
  image_url?: string
  banner_url?: string
  parent_id?: number | null
  product_count?: number
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

// Type definitions for side panel items (premium experiences, product showcase, etc.)
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

// Main response interface
export interface UIBatchData {
  carousel: CarouselItem[] | null
  topbar: TopbarItem[] | null
  categories: Category[] | null
  sidePanels: {
    premium?: PanelItem[]
    showcase?: PanelItem[]
  } | null
  timestamp?: number
  duration: number
  cached?: boolean
  total_execution_ms?: number
  error?: string
}

// Default fallback data in case of API failures
const DEFAULT_UI_BATCH: UIBatchData = {
  carousel: [
    {
      image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 600'%3E%3Crect fill='%238B1538' width='1200' height='600'/%3E%3C/svg%3E",
      title: 'Welcome to Mizizzi Store',
      description: 'Discover premium products and exclusive deals',
      buttonText: 'Shop Now',
      href: '/products',
    },
  ],
  topbar: null,
  categories: [],
  sidePanels: null,
  timestamp: Date.now(),
  duration: 0,
  cached: false,
}

/**
 * Server-side cached function to fetch all UI batch data
 * Uses React cache() to deduplicate identical requests within a single render cycle
 * Uses Next.js ISR with 60s revalidate for optimal performance
 * 
 * @param sections - Optional comma-separated list of sections to fetch (e.g., "carousel,categories")
 * @param useCache - Whether to use cached data (default: true)
 * @returns Promise<UIBatchData> - All UI batch data with fallbacks
 */
export const getUIBatch = cache(
  async (sections?: string, useCache: boolean = true): Promise<UIBatchData> => {
    try {
      // Build request URL - use NEXT_PUBLIC_API_URL for backend
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const url = new URL('/api/ui/batch', apiUrl)
      
      if (sections) {
        url.searchParams.set('sections', sections)
      }
      
      if (!useCache) {
        url.searchParams.set('cache', 'false')
      }

      console.log('[v0] getUIBatch: Fetching from backend API:', url.toString())

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000) // 8 second timeout

      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept-Encoding': 'gzip, deflate, br',
        },
        next: {
          revalidate: useCache ? 60 : 0, // 60s default cache
          tags: ['ui-batch', 'carousel', 'topbar', 'categories', 'side-panels'],
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.warn('[v0] getUIBatch: API returned status', response.status)
        return DEFAULT_UI_BATCH
      }

      const rawData = await response.json() as any

      const executionTime = rawData.total_execution_ms || 0
      console.log('[v0] getUIBatch: Successfully fetched batch data in', executionTime.toFixed(2), 'ms (Cached:', rawData.cached, ')')

      // Backend returns FLAT structure: { carousel: [...], categories: [...], sidePanels: {...}, topbar: null, ... }
      // NOT nested under sections
      const carouselData = Array.isArray(rawData?.carousel) ? rawData.carousel : []
      const categoriesData = Array.isArray(rawData?.categories) ? rawData.categories : []
      const topbarData = Array.isArray(rawData?.topbar) ? rawData.topbar : null
      const sidePanelsData = rawData?.sidePanels || null

      console.log('[v0] Extracted from backend - carousel:', carouselData.length, 'categories:', categoriesData.length, 'sidePanels:', sidePanelsData ? 'present' : 'null')

      // Normalize and validate response data
      return {
        carousel: carouselData.length > 0 ? carouselData : DEFAULT_UI_BATCH.carousel,
        topbar: topbarData,
        categories: categoriesData,
        sidePanels: sidePanelsData,
        timestamp: rawData.timestamp ? new Date(rawData.timestamp).getTime() : Date.now(),
        duration: executionTime,
        cached: rawData.cached || false,
      }
    } catch (error) {
      console.error('[v0] getUIBatch: Error fetching batch data:', error)
      return DEFAULT_UI_BATCH
    }
  }
)

/**
 * Specialized fetcher for carousel data only
 * Useful when you only need carousel items to avoid fetching unnecessary data
 */
export const getCarouselBatch = cache(async (): Promise<CarouselItem[]> => {
  try {
    const data = await getUIBatch('carousel', true)
    return data.carousel || DEFAULT_UI_BATCH.carousel || []
  } catch (error) {
    console.error('[v0] getCarouselBatch: Error:', error)
    return DEFAULT_UI_BATCH.carousel || []
  }
})

/**
 * Specialized fetcher for categories only
 * Useful when you only need categories to avoid fetching unnecessary data
 */
export const getCategoriesBatch = cache(async (): Promise<Category[]> => {
  try {
    const data = await getUIBatch('categories', true)
    return data.categories || []
  } catch (error) {
    console.error('[v0] getCategoriesBatch: Error:', error)
    return []
  }
})

/**
 * Specialized fetcher for side panels only
 * Useful when you only need side panels (premium experiences, product showcase)
 */
export const getSidePanelsBatch = cache(async () => {
  try {
    const data = await getUIBatch('sidePanels', true)
    return data.sidePanels || null
  } catch (error) {
    console.error('[v0] getSidePanelsBatch: Error:', error)
    return null
  }
})
