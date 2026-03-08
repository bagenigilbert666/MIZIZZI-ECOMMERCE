import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  try {
    // Proxy to backend health check
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://mizizzi-ecommerce-1.onrender.com'}/api/health`, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    const data = await response.json()
    
    return NextResponse.json(data, {
      status: response.ok ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('[v0] Health check error:', error)
    return NextResponse.json(
      {
        status: 'unhealthy',
        message: 'Failed to check backend health',
      },
      { status: 503 }
    )
  }
}
