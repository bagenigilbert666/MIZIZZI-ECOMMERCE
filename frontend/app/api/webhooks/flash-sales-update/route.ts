import { NextRequest, NextResponse } from 'next/server'
import { handleFlashSalesWebhook } from '@/lib/cache/flash-sales-invalidation'

/**
 * Webhook Handler - Flash Sales Updates
 * 
 * Called by backend when:
 * - Admin creates/updates flash sale
 * - Flash sale event ends
 * - Stock levels change significantly
 * 
 * Clears server cache and notifies clients via header
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret (add to env vars)
    const secret = request.headers.get('x-webhook-secret')
    const expectedSecret = process.env.FLASH_SALE_WEBHOOK_SECRET || 'dev-secret'

    if (secret !== expectedSecret) {
      console.warn('[v0] Unauthorized webhook attempt')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { event, product_ids, timestamp } = body

    console.log('[v0] Flash sales webhook received:', {
      event,
      productCount: product_ids?.length,
      timestamp,
    })

    // Process webhook
    const result = await handleFlashSalesWebhook(event, product_ids)

    // Return success with cache control headers
    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'X-Cache-Invalidated': 'true',
        'X-Webhook-Event': event,
      },
    })

  } catch (error) {
    console.error('[v0] Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

/**
 * GET - Health check for webhook endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'active',
    description: 'Flash sales webhook endpoint',
    methods: ['POST'],
  })
}
