import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'

/**
 * Feature Cards Cache Invalidation Endpoint
 * 
 * Triggers immediate revalidation of:
 * - Next.js cache tags: 'feature-cards', 'homepage'
 * - Frontend API routes
 * - Backend feature cards cache
 * 
 * Usage:
 * POST /api/feature-cards/invalidate
 * Authorization: Bearer <CACHE_INVALIDATION_TOKEN>
 */

export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication check
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CACHE_INVALIDATION_TOKEN

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[Feature Cards] Cache invalidation requested')

    // Revalidate Next.js cache tags
    revalidateTag('feature-cards')
    revalidateTag('homepage')

    // Trigger backend cache invalidation if endpoint exists
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
    try {
      await fetch(`${apiBaseUrl}/api/cache/invalidate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.API_AUTH_TOKEN && {
            'Authorization': `Bearer ${process.env.API_AUTH_TOKEN}`
          })
        },
        body: JSON.stringify({
          patterns: ['feature_cards', 'homepage']
        })
      }).catch(err => {
        console.log('[Feature Cards] Backend cache invalidation skipped:', err.message)
        // Don't fail if backend invalidation fails - frontend cache is enough
      })
    } catch (err) {
      console.log('[Feature Cards] Backend cache invalidation error:', err)
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Feature cards cache invalidated',
        invalidatedTags: ['feature-cards', 'homepage'],
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (error) {
    console.error('[Feature Cards] Invalidation error:', error)
    return NextResponse.json(
      { error: 'Failed to invalidate feature cards cache' },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to test cache invalidation
 * Returns information about current cache status
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      endpoint: '/api/feature-cards/invalidate',
      methods: ['POST'],
      description: 'Invalidates feature cards cache',
      authentication: 'Bearer token via Authorization header (optional)',
      environment: {
        hasInvalidationToken: !!process.env.CACHE_INVALIDATION_TOKEN,
        hasApiAuthToken: !!process.env.API_AUTH_TOKEN,
        apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      },
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )
}
