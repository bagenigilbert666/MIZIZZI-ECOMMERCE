import { NextRequest, NextResponse } from 'next/server'
import redis, { getCachedData, setCachedData, CACHE_CONFIG } from '@/lib/redis'
import { productService } from '@/services/product'

export const runtime = 'nodejs'
export const revalidate = 0

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id || id === 'undefined' || id === 'null') {
      return NextResponse.json(
        { error: 'Invalid product ID' },
        { status: 400 }
      )
    }

    // Generate cache key for single product
    const cacheKey = `${CACHE_CONFIG.PRODUCT_DETAIL.key}:${id}`
    console.log('[v0] Product API - Cache key:', cacheKey)

    // Try to get from Redis cache
    const cachedProduct = await getCachedData(cacheKey)
    if (cachedProduct) {
      return NextResponse.json(
        {
          data: cachedProduct,
          source: 'redis-cache',
          timestamp: new Date().toISOString(),
        },
        {
          headers: {
            'Cache-Control': 'public, max-age=900',
            'X-Cache-Source': 'redis',
          },
        }
      )
    }

    // If not in cache, fetch from product service
    console.log('[v0] Fetching product', id, 'from service...')
    const product = await productService.getProduct(id)

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Store in Redis cache
    await setCachedData(cacheKey, product, CACHE_CONFIG.PRODUCT_DETAIL.ttl)

    return NextResponse.json(
      {
        data: product,
        source: 'api',
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=900',
          'X-Cache-Source': 'api',
        },
      }
    )
  } catch (error) {
    console.error('[v0] Product API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}
