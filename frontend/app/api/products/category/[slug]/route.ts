import { NextRequest, NextResponse } from 'next/server'
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

    console.log('[v0] Fetching products for category:', slug)
    const products = await productService.getProductsByCategory(slug)

    return NextResponse.json(
      {
        data: products,
        source: 'api',
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=600',
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
