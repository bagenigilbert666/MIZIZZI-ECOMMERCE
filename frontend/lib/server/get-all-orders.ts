import type { Order } from "@/types"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://mizizzi-ecommerce-1.onrender.com"

function extractOrders(payload: any): Order[] {
  const data = payload?.data ?? payload

  // Try different response formats
  if (Array.isArray(data?.orders)) return data.orders
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data)) return data
  if (data?.data && Array.isArray(data.data)) return data.data

  return []
}

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
    console.log("[v0] getAllOrders: Fetching orders from backend at", API_BASE_URL)

    // Fetch from the backend orders API endpoint
    const url = new URL(`${API_BASE_URL}/api/orders`)
    url.searchParams.append("per_page", String(limit))
    url.searchParams.append("page", String(page))
    url.searchParams.append("include_items", "true")

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      next: {
        revalidate: 60, // ISR: revalidate every 60 seconds
        tags: ["all-orders"],
      },
    })

    if (!response.ok) {
      console.error("[v0] getAllOrders: API returned status", response.status)
      throw new Error(`API returned status ${response.status}`)
    }

    const data = await response.json()
    console.log("[v0] getAllOrders: API response:", data)

    const orders = extractOrders(data)
    console.log("[v0] getAllOrders: Extracted", orders.length, "orders")

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
