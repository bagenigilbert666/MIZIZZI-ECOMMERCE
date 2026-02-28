import type { Order, OrderItem, OrdersResponse } from "@/types"

export interface OrderItem {
  id: number | string
  order_id: number | string
  product_id: number | string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
}

export interface Order {
  id: number | string
  order_number: string
  user_id: string
  customer_name: string
  customer_email: string
  created_at: string
  updated_at: string
  status: string
  payment_status: string
  payment_method: string
  tracking_number?: string | null
  tracking_url?: string | null
  notes?: string | null
  return_reason?: string | null
  total_amount: number
  subtotal_amount?: number
  shipping_amount?: number
  tax_amount?: number
  items?: OrderItem[]
}

export interface OrdersResponse {
  items: Order[]
  pagination: {
    total_pages: number
    total_items: number
    current_page: number
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://mizizzi-ecommerce-1.onrender.com"

function extractOrders(payload: any): Order[] {
  const data = payload?.data ?? payload
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.orders)) return data.orders
  return []
}

/**
 * Server-side function to fetch admin orders
 * This runs on the server through a local API endpoint
 * Uses caching with ISR (Incremental Static Regeneration)
 * No authentication needed - the backend endpoint is public for admin
 */
export async function getAdminOrders(params?: {
  page?: number
  per_page?: number
  status?: string
  search?: string
}): Promise<OrdersResponse> {
  try {
    // Try the local API endpoint first
    const localEndpoint = "/api/admin/orders"
    const queryParams = new URLSearchParams()

    if (params?.page) queryParams.append("page", params.page.toString())
    if (params?.per_page) queryParams.append("per_page", params.per_page.toString())
    if (params?.status) queryParams.append("status", params.status)
    if (params?.search) queryParams.append("search", params.search)

    const fullUrl = `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"}${localEndpoint}${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

    console.log("[v0] getAdminOrders: Fetching from local endpoint:", fullUrl)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    const response = await fetch(fullUrl, {
      method: "GET",
      signal: controller.signal,
      next: {
        revalidate: 30, // Cache for 30 seconds on the server
        tags: ["admin-orders"], // Tag for on-demand revalidation
      },
      headers: {
        "Content-Type": "application/json",
      },
    })

    clearTimeout(timeoutId)

    console.log("[v0] getAdminOrders: Response status:", response.status)

    if (response.ok) {
      const data = await response.json()
      console.log("[v0] getAdminOrders: Successfully fetched", data?.items?.length || 0, "orders")

      return (
        data || {
          items: [],
          pagination: {
            total_pages: 1,
            total_items: 0,
            current_page: 1,
          },
        }
      )
    }

    console.warn("[v0] getAdminOrders: Local API failed with status", response.status)
  } catch (error) {
    console.error("[v0] getAdminOrders: Local API error:", error)
  }

  // Fallback: Return empty response
  console.log("[v0] getAdminOrders: Returning empty response")
  return {
    items: [],
    pagination: {
      total_pages: 1,
      total_items: 0,
      current_page: 1,
    },
  }
}

