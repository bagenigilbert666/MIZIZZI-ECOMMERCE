"""
Frontend Homepage Data Fetcher
Single unified entry point for fetching all homepage data from the backend.
Handles caching, error handling, and fallbacks gracefully.
"""
import { getCurrentSettings } from './config'

interface HomepageData {
  status: 'success' | 'error'
  data: {
    categories: Array<{
      id: number
      name: string
      slug: string
      image_url?: string
      description?: string
    }>
    carousel: Array<{
      id: number
      title: string
      image_url: string
      link?: string
      order: number
    }>
    featured: {
      trending: any[]
      flash_sale: any[]
      new_arrivals: any[]
      top_picks: any[]
      daily_finds: any[]
      luxury_deals: any[]
    }
    all_products: any[]
    all_products_has_more: boolean
  }
  timestamp?: number
}

/**
 * Fetch all homepage data in one unified request.
 *
 * This function:
 * - Calls /api/homepage/data (single batch endpoint)
 * - Returns all homepage sections at once
 * - Uses the aggregator on the backend for clean orchestration
 * - Each section has its own Redis caching per-section TTL
 * - Plus top-level homepage cache with 60s TTL
 *
 * Benefits:
 * - Single network request instead of 13 separate ones
 * - No waterfall loading delays
 * - All sections load in parallel
 * - Graceful fallback if any section fails
 *
 * @returns Promise<HomepageData> - All homepage data
 * @throws Error if the request fails
 */
export async function getHomepageData(): Promise<HomepageData> {
  try {
    const settings = getCurrentSettings()
    const apiUrl = settings.apiUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

    const response = await fetch(`${apiUrl}/api/homepage/data`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      cache: 'no-store', // Let Redis caching on the backend handle it
    })

    if (!response.ok) {
      console.error(`[getHomepageData] HTTP ${response.status}: ${response.statusText}`)
      throw new Error(`Failed to fetch homepage data: ${response.status}`)
    }

    const data: HomepageData = await response.json()

    // Ensure we have the expected structure even if some sections are empty
    if (data?.data) {
      return {
        status: data.status || 'success',
        data: {
          categories: data.data.categories || [],
          carousel: data.data.carousel || [],
          featured: {
            trending: data.data.featured?.trending || [],
            flash_sale: data.data.featured?.flash_sale || [],
            new_arrivals: data.data.featured?.new_arrivals || [],
            top_picks: data.data.featured?.top_picks || [],
            daily_finds: data.data.featured?.daily_finds || [],
            luxury_deals: data.data.featured?.luxury_deals || [],
          },
          all_products: data.data.all_products || [],
          all_products_has_more: data.data.all_products_has_more || false,
        },
        timestamp: data.timestamp,
      }
    }

    return data
  } catch (error) {
    console.error('[getHomepageData] Error fetching homepage data:', error)

    // Return safe fallback structure
    return {
      status: 'error',
      data: {
        categories: [],
        carousel: [],
        featured: {
          trending: [],
          flash_sale: [],
          new_arrivals: [],
          top_picks: [],
          daily_finds: [],
          luxury_deals: [],
        },
        all_products: [],
        all_products_has_more: false,
      },
    }
  }
}

/**
 * Health check for homepage service.
 * Useful for monitoring and debugging.
 */
export async function checkHomepageHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy'
  sections_available?: Record<string, boolean>
  error?: string
}> {
  try {
    const settings = getCurrentSettings()
    const apiUrl = settings.apiUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

    const response = await fetch(`${apiUrl}/api/homepage/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      return {
        status: 'unhealthy',
        error: `HTTP ${response.status}`,
      }
    }

    return await response.json()
  } catch (error) {
    console.error('[checkHomepageHealth] Error checking health:', error)
    return {
      status: 'unhealthy',
      error: String(error),
    }
  }
}
