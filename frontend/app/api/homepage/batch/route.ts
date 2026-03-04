import { NextResponse } from 'next/server'
import type { Product } from '@/types'
import { API_BASE_URL } from '@/lib/config'

interface HomepageBatchResponse {
  flashSales: { products: Product[]; event: any } | null
  trending: Product[] | null
  topPicks: Product[] | null
  newArrivals: Product[] | null
  dailyDeals: Product[] | null
  luxuryDeals: Product[] | null
  categories: any[] | null
  error?: string
  timestamp: number
  duration: number
}

// Helper to extract products from various response formats
function extractProducts(payload: any): Product[] {
  const data = payload?.data ?? payload
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.products)) return data.products
  if (Array.isArray(data?.data)) return data.data
  return []
}

// Fetch a single featured section
async function fetchFeaturedSection(
  sectionName: string,
  query: string,
  limit: number = 20,
  timeout: number = 5000
): Promise<Product[] | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const url = `${API_BASE_URL}/api/products/${query}`
    
    const response = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 60, tags: [sectionName] },
      headers: { 'Content-Type': 'application/json' },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error(`[BATCH] Failed to fetch ${sectionName}: ${response.status}`)
      return null
    }

    let products = extractProducts(await response.json())
    return products.slice(0, limit)
  } catch (error) {
    console.error(`[BATCH] Error fetching ${sectionName}:`, error)
    return null
  }
}

export async function GET(request: Request) {
  const startTime = performance.now()

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const flashSaleLimit = parseInt(searchParams.get('flashSaleLimit') || '12')
    const trendingLimit = parseInt(searchParams.get('trendingLimit') || '15')
    const topPicksLimit = parseInt(searchParams.get('topPicksLimit') || '12')
    const newArrivalsLimit = parseInt(searchParams.get('newArrivalsLimit') || '12')
    const dailyDealsLimit = parseInt(searchParams.get('dailyDealsLimit') || '12')
    const luxuryDealsLimit = parseInt(searchParams.get('luxuryDealsLimit') || '12')
    const categoriesLimit = parseInt(searchParams.get('categoriesLimit') || '8')

    // Execute all queries in PARALLEL using Promise.all
    // This is the key optimization: all queries run simultaneously, not sequentially
    const [
      flashSalesResult,
      trendingResult,
      topPicksResult,
      newArrivalsResult,
      dailyDealsResult,
      luxuryDealsResult,
      categoriesResult,
    ] = await Promise.all([
      // Flash Sales: is_flash_sale=true
      fetchFeaturedSection('flash-sales', `?is_flash_sale=true&per_page=${flashSaleLimit}`, flashSaleLimit),
      // Trending: is_trending=true
      fetchFeaturedSection('trending', `?is_trending=true&per_page=${trendingLimit}`, trendingLimit),
      // Top Picks: is_top_pick=true
      fetchFeaturedSection('top-picks', `?is_top_pick=true&per_page=${topPicksLimit}`, topPicksLimit),
      // New Arrivals: is_new_arrival=true
      fetchFeaturedSection('new-arrivals', `?is_new_arrival=true&per_page=${newArrivalsLimit}`, newArrivalsLimit),
      // Daily Deals: is_daily_deal=true
      fetchFeaturedSection('daily-deals', `?is_daily_deal=true&per_page=${dailyDealsLimit}`, dailyDealsLimit),
      // Luxury Deals: is_luxury_deal=true
      fetchFeaturedSection('luxury-deals', `?is_luxury_deal=true&per_page=${luxuryDealsLimit}`, luxuryDealsLimit),
      // Categories: GET /api/categories
      (async () => {
        try {
          const url = `${API_BASE_URL}/api/categories?per_page=${categoriesLimit}`
          const response = await fetch(url, {
            next: { revalidate: 3600, tags: ['categories'] },
            headers: { 'Content-Type': 'application/json' },
          })
          if (!response.ok) return null
          const data = await response.json()
          return Array.isArray(data?.data) ? data.data.slice(0, categoriesLimit) : null
        } catch {
          return null
        }
      })(),
    ])

    const duration = performance.now() - startTime

    const response: HomepageBatchResponse = {
      flashSales: flashSalesResult ? { products: flashSalesResult, event: null } : null,
      trending: trendingResult,
      topPicks: topPicksResult,
      newArrivals: newArrivalsResult,
      dailyDeals: dailyDealsResult,
      luxuryDeals: luxuryDealsResult,
      categories: categoriesResult,
      timestamp: Date.now(),
      duration,
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        'X-Response-Time': `${duration.toFixed(2)}ms`,
      },
    })
  } catch (error) {
    const duration = performance.now() - startTime
    console.error('[BATCH] Unexpected error:', error)
    return NextResponse.json(
      {
        flashSales: null,
        trending: null,
        topPicks: null,
        newArrivals: null,
        dailyDeals: null,
        luxuryDeals: null,
        categories: null,
        error: 'Failed to fetch homepage data',
        timestamp: Date.now(),
        duration,
      },
      { status: 500 }
    )
  }
}
