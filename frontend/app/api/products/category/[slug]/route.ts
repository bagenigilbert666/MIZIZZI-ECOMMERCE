import { NextRequest, NextResponse } from 'next/server'
import redis, { getCachedData, setCachedData, CACHE_CONFIG } from '@/lib/redis'
import { productService } from '@/services/product'

export const runtime = 'nodejs'
export const revalidate = 0

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    if (!slug) {
      return NextResponse.json(
        { error: 'Invalid category slug' },
        { status: 400 }
      )
    }

    // Generate cache key for category products
    const cacheKey = `${CACHE_CONFIG.PRODUCTS_CATEGORY.key}:${slug}`
    console.log('[v0] Category Products API - Cache key:', cacheKey)

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
            'Cache-Control': 'public, max-age=600',
            'X-Cache-Source': 'redis',
          },
        }
      )
    }

    // If not in cache, fetch from product service
    console.log('[v0] Fetching products for category', slug, 'from service...')
    const products = await productService.getProductsByCategory(slug)

    // Store in Redis cache
    await setCachedData(cacheKey, products, CACHE_CONFIG.PRODUCTS_CATEGORY.ttl)

    return NextResponse.json(
      {
        data: products,
        source: 'api',
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=600',
          'X-Cache-Source': 'api',
        },
      }
    )
  } catch (error) {
    console.error('[v0] Category Products API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}
