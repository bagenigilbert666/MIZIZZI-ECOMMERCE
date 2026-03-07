import { NextResponse } from 'next/server'
import { getRedisHealth } from '@/lib/redis'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const health = await getRedisHealth()
    
    return NextResponse.json(health, {
      status: health.status === 'healthy' ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('[v0] Health check error:', error)
    return NextResponse.json(
      {
        status: 'unhealthy',
        message: 'Failed to check Redis health',
      },
      { status: 503 }
    )
  }
}
