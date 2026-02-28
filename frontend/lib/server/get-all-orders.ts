import type { Order } from "@/types"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://mizizzi-ecommerce-1.onrender.com"

function extractOrders(payload: any): Order[] {
  const data = payload?.data ?? payload
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.orders)) return data.orders
  if (Array.isArray(data?.data)) return data.data
  return []
}

function extractOrderStats(payload: any, orders: Order[] = []): {
  total: number
  pending: number
  processing: number
  shipped: number
  delivered: number
  cancelled: number
  revenue: number
} {
  let stats = {
    total: payload?.total || payload?.counts?.orders || orders.length || 0,
    pending: payload?.pending || 0,
    processing: payload?.processing || 0,
    shipped: payload?.shipped || 0,
    delivered: payload?.delivered || 0,
    cancelled: payload?.cancelled || 0,
    revenue: payload?.revenue || payload?.total_revenue || 0,
  }

  // If stats are not provided but we have orders, calculate them
  if ((stats.pending === 0 && stats.processing === 0 && stats.shipped === 0 && stats.delivered === 0 && stats.cancelled === 0) && orders.length > 0) {
    stats = {
      total: orders.length,
      pending: orders.filter((o) => o.status?.toLowerCase() === "pending").length,
      processing: orders.filter((o) => o.status?.toLowerCase() === "processing").length,
      shipped: orders.filter((o) => o.status?.toLowerCase() === "shipped").length,
      delivered: orders.filter((o) => o.status?.toLowerCase() === "delivered").length,
      cancelled: orders.filter((o) => o.status?.toLowerCase() === "cancelled" || o.status?.toLowerCase() === "canceled").length,
      revenue: orders.reduce((sum, o) => sum + (o.total || 0), 0),
    }
  }

  return stats
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
    // Try the local API endpoint first (running on the same Next.js server)
    const localEndpoint = `/api/admin/orders?per_page=${limit}&page=${page}`

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

      const response = await fetch(
        `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"}${localEndpoint}`,
        {
          signal: controller.signal,
          next: {
            revalidate: 60, // Cache for 60 seconds on the server
            tags: ["all-orders"], // Tag for on-demand revalidation
          },
          headers: {
            "Content-Type": "application/json",
          },
        }
      )

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        const orders = extractOrders(data)

        // Extract pagination info
        const pagination = {
          total_items: data?.pagination?.total_items || data?.total_items || orders.length,
          total_pages: data?.pagination?.total_pages || data?.total_pages || 1,
          current_page: data?.pagination?.current_page || page,
        }

        // Extract stats if available
        const stats = data?.stats ? extractOrderStats(data.stats, orders) : extractOrderStats(data, orders)

        if (orders.length > 0 || !includeStats) {
          return {
            orders,
            stats,
            pagination,
          }
        }
      }
    } catch (err) {
      console.error("[v0] getAllOrders: Local API failed:", err)

      // Fallback to external API
      try {
        const ordersEndpoint = `${API_BASE_URL}/api/admin/orders?per_page=${limit}&page=${page}`
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        const response = await fetch(ordersEndpoint, {
          signal: controller.signal,
          next: {
            revalidate: 60,
            tags: ["all-orders"],
          },
          headers: {
            "Content-Type": "application/json",
          },
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          const data = await response.json()
          const orders = extractOrders(data)

          const pagination = {
            total_items: data?.pagination?.total_items || data?.total_items || orders.length,
            total_pages: data?.pagination?.total_pages || data?.total_pages || 1,
            current_page: data?.pagination?.current_page || page,
          }

          const stats = data?.stats ? extractOrderStats(data.stats, orders) : extractOrderStats(data, orders)

          return {
            orders,
            stats,
            pagination,
          }
        }
      } catch (fallbackErr) {
        console.error("[v0] getAllOrders: External API also failed:", fallbackErr)
      }
    }

    // Fallback to empty array
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
  } catch (error) {
    console.error("[v0] getAllOrders: Critical error:", error)
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
