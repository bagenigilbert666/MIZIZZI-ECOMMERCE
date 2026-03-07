import { NextRequest, NextResponse } from 'next/server'
import redis, { invalidateCache, CACHE_CONFIG } from '@/lib/redis'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication check here
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CACHE_INVALIDATION_TOKEN

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { pattern = 'products' } = body

    console.log('[v0] Cache invalidation requested for pattern:', pattern)

    // Invalidate cache pattern
    await invalidateCache(pattern)

    return NextResponse.json(
      {
        success: true,
        message: `Cache invalidated for pattern: ${pattern}*`,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (error) {
    console.error('[v0] Cache invalidation error:', error)
    return NextResponse.json(
      { error: 'Failed to invalidate cache' },
      { status: 500 }
    )
  }
}

// GET endpoint to check cache status
export async function GET(request: NextRequest) {
  try {
    const dbSize = await redis.dbsize()
    const info = await redis.info()

    return NextResponse.json(
      {
        status: 'ok',
        cache: {
          keysCount: dbSize,
          info: info,
        },
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (error) {
    console.error('[v0] Cache status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check cache status' },
      { status: 500 }
    )
  }
}
