import { NextRequest, NextResponse } from 'next/server'
import redis, { getCachedData, setCachedData, CACHE_CONFIG } from '@/lib/redis'
import { productService } from '@/services/product'

export const runtime = 'nodejs'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Build cache key from query parameters
    const params: Record<string, any> = {}
    for (const [key, value] of searchParams.entries()) {
      params[key] = value
    }

    // Generate cache key
    const cacheKey = `${CACHE_CONFIG.PRODUCTS_LIST.key}:${JSON.stringify(params)}`
    console.log('[v0] Products API - Cache key:', cacheKey)

    // Try to get from Redis cache
    const cachedProducts = await getCachedData(cacheKey)
    if (cachedProducts) {
      return NextResponse.json(
        {
          data: cachedProducts,
          source: 'redis-cache',
          timestamp: new Date().toISOString(),
        },
        {
          headers: {
            'Cache-Control': 'public, max-age=300',
            'X-Cache-Source': 'redis',
          },
        }
      )
    }

    // If not in cache, fetch from product service
    console.log('[v0] Fetching products from service...')
    const products = await productService.getProducts(params)

    // Store in Redis cache
    await setCachedData(cacheKey, products, CACHE_CONFIG.PRODUCTS_LIST.ttl)

    return NextResponse.json(
      {
        data: products,
        source: 'api',
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=300',
          'X-Cache-Source': 'api',
        },
      }
    )
  } catch (error) {
    console.error('[v0] Products API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}
