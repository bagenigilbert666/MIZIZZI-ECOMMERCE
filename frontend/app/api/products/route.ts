import { NextRequest, NextResponse } from 'next/server'
import { productService } from '@/services/product'

export const runtime = 'nodejs'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Build parameters from query string
    const params: Record<string, any> = {}
    for (const [key, value] of searchParams.entries()) {
      params[key] = value
    }

    console.log('[v0] Fetching products with params:', params)
    const products = await productService.getProducts(params)

    return NextResponse.json(
      {
        data: products,
        source: 'api',
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=300',
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
