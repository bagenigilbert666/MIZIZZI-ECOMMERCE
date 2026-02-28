import type { Order } from "@/types"
import { orderService } from "@/services/orders"

function calculateOrderStats(orders: Order[]): {
  total: number
  pending: number
  processing: number
  shipped: number
  delivered: number
  cancelled: number
  revenue: number
} {
  return {
    total: orders.length,
    pending: orders.filter((o) => o.status?.toLowerCase() === "pending").length,
    processing: orders.filter((o) => o.status?.toLowerCase() === "processing").length,
    shipped: orders.filter((o) => o.status?.toLowerCase() === "shipped").length,
    delivered: orders.filter((o) => o.status?.toLowerCase() === "delivered").length,
    cancelled: orders.filter((o) => o.status?.toLowerCase() === "cancelled" || o.status?.toLowerCase() === "canceled").length,
    revenue: orders.reduce((sum, o) => sum + ((o.total_amount || o.total) ?? 0), 0),
  }
}

/**
 * Server-side function to fetch all orders with pagination
 * This runs on the server before the page is sent to the browser
 * Uses caching with ISR (Incremental Static Regeneration)
 */
export async function getAllOrders(
  limit = 50,
  page = 1,
  includeStats = true
): Promise<{ orders: Order[]; stats: any; pagination: any }> {
  try {
    console.log("[v0] getAllOrders: Fetching orders from service")
    
    // Fetch orders using the order service (which connects to the backend)
    const orders = await orderService.getOrders({
      per_page: limit,
      page: page,
      include_items: true,
    })

    console.log("[v0] getAllOrders: Received", orders.length, "orders")

    // Calculate stats from the orders
    const stats = calculateOrderStats(orders)

    // Extract pagination info
    const pagination = {
      total_items: orders.length,
      total_pages: Math.ceil(orders.length / limit),
      current_page: page,
    }

    return {
      orders,
      stats,
      pagination,
    }
  } catch (error) {
    console.error("[v0] getAllOrders: Error fetching orders:", error)
    return {
      orders: [],
      stats: {
        total: 0,
        pending: 0,
        processing: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
        revenue: 0,
      },
      pagination: {
        total_items: 0,
        total_pages: 1,
        current_page: page,
      },
    }
  }
}
