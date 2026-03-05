import { NextResponse } from 'next/server'
import { API_BASE_URL } from '@/lib/config'

interface UIBatchResponse {
  carousel: any | null
  topbar: any | null
  categories: any | null
  sidePanels: any | null
  error?: string
  timestamp: number
  duration: number
}

/**
 * Frontend UI Batch API Route
 * Proxies requests to backend /api/ui/batch endpoint
 * Provides a single unified endpoint for all UI component data fetching
 * 
 * This route acts as a relay to the backend batch API, allowing the frontend
 * to fetch carousel, topbar, categories, and side panels data in a single request.
 */
export async function GET(request: Request) {
  const startTime = performance.now()

  try {
    // Parse query parameters for selective fetching and cache control
    const { searchParams } = new URL(request.url)
    const sections = searchParams.get('sections') // comma-separated list like "carousel,categories"
    const useCache = searchParams.get('cache') !== 'false' // default to true
    
    // Build backend URL with parameters
    const backendUrl = new URL(`${API_BASE_URL}/api/ui/batch`)
    
    if (sections) {
      backendUrl.searchParams.set('sections', sections)
    }
    
    if (!useCache) {
      backendUrl.searchParams.set('cache', 'false')
    }

    console.log('[v0] UI Batch: Fetching from backend:', backendUrl.toString())

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    // Proxy request to backend batch endpoint
    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      // Use Next.js caching for the proxied response
      next: {
        revalidate: useCache ? 60 : 0, // 60s default cache, or no cache if specified
        tags: ['ui-batch', 'carousel', 'topbar', 'categories', 'side-panels'],
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error('[v0] UI Batch: Backend returned error status:', response.status)
      const duration = performance.now() - startTime
      
      return NextResponse.json(
        {
          carousel: null,
          topbar: null,
          categories: null,
          sidePanels: null,
          error: `Backend returned status ${response.status}`,
          timestamp: Date.now(),
          duration,
        } as UIBatchResponse,
        { 
          status: response.status,
          headers: {
            'X-Response-Time': `${duration.toFixed(2)}ms`,
            'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=60',
          },
        }
      )
    }

    const backendData = await response.json()
    const duration = performance.now() - startTime

    console.log('[v0] UI Batch: Successfully fetched from backend in', duration.toFixed(2), 'ms')

    const responseData: UIBatchResponse = {
      carousel: backendData.carousel || null,
      topbar: backendData.topbar || null,
      categories: backendData.categories || null,
      sidePanels: backendData.sidePanels || null,
      timestamp: Date.now(),
      duration,
    }

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        'X-Response-Time': `${duration.toFixed(2)}ms`,
        'X-Backend-Time': response.headers.get('X-Response-Time') || 'unknown',
      },
    })
  } catch (error) {
    const duration = performance.now() - startTime
    console.error('[v0] UI Batch: Unexpected error:', error)
    
    return NextResponse.json(
      {
        carousel: null,
        topbar: null,
        categories: null,
        sidePanels: null,
        error: error instanceof Error ? error.message : 'Failed to fetch UI batch data',
        timestamp: Date.now(),
        duration,
      } as UIBatchResponse,
      { 
        status: 500,
        headers: {
          'X-Response-Time': `${duration.toFixed(2)}ms`,
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
        },
      }
    )
  }
}
