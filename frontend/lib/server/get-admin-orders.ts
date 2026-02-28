import { cache } from "react"
import { cookies } from "next/headers"

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

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "https://mizizzi-ecommerce-1.onrender.com"

/**
 * Fetch admin orders from the backend using server-side authentication
 * This requires a token to be passed from the client since auth is client-side managed
 */
export const getAdminOrders = cache(
  async (params?: {
    page?: number
    per_page?: number
    status?: string
    payment_status?: string
    search?: string
    date_from?: string
    date_to?: string
    min_amount?: number
    max_amount?: number
    token?: string
  }): Promise<OrdersResponse> => {
    try {
      // Get token from params (passed from client) or environment
      const token = params?.token || process.env.ADMIN_API_TOKEN

      if (!token) {
        console.log("[v0] getAdminOrders: No admin token available - returning empty orders")
        // Return empty response instead of failing - client will fetch with auth
        return {
          items: [],
          pagination: {
            total_pages: 1,
            total_items: 0,
            current_page: 1,
          },
        }
      }

      const url = new URL(`${BASE_URL}/api/admin/orders`)

      url.searchParams.append("include_items", "true")
      url.searchParams.append("with_items", "true")

      // Add query parameters if provided (exclude token from params)
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && key !== "token") {
            url.searchParams.append(key, value.toString())
          }
        })
      }

      console.log("[v0] getAdminOrders: Fetching from", url.toString())

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        signal: controller.signal,
        next: { revalidate: 30, tags: ["admin-orders"] },
      })

      clearTimeout(timeoutId)

      console.log("[v0] getAdminOrders: Response status:", response.status)

      if (!response.ok) {
        console.error("[v0] getAdminOrders: API returned status", response.status)
        // Return empty response on error instead of failing
        return {
          items: [],
          pagination: {
            total_pages: 1,
            total_items: 0,
            current_page: 1,
          },
        }
      }

      const data = await response.json()
      console.log("[v0] getAdminOrders: Successfully fetched", data?.items?.length || 0, "orders")
      
      return data || {
        items: [],
        pagination: {
          total_pages: 1,
          total_items: 0,
          current_page: 1,
        },
      }
    } catch (error) {
      console.error("[v0] getAdminOrders: Error fetching orders:", error)
      // Return empty response on error
      return {
        items: [],
        pagination: {
          total_pages: 1,
          total_items: 0,
          current_page: 1,
        },
      }
    }
  },
)

