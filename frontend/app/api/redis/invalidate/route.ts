import { NextRequest, NextResponse } from 'next/server'
import { invalidateCache, clearAllCache } from '@/lib/redis'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pattern, clearAll } = body

    if (clearAll === true) {
      await clearAllCache()
      return NextResponse.json(
        { success: true, message: 'All cache cleared' },
        { headers: { 'Cache-Control': 'no-cache, no-store' } }
      )
    }

    if (!pattern || typeof pattern !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Pattern is required' },
        { status: 400 }
      )
    }

    await invalidateCache(pattern)
    
    return NextResponse.json(
      { success: true, message: `Cache invalidated for pattern: ${pattern}` },
      { headers: { 'Cache-Control': 'no-cache, no-store' } }
    )
  } catch (error) {
    console.error('[v0] Cache invalidation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to invalidate cache' },
      { status: 500 }
    )
  }
}
