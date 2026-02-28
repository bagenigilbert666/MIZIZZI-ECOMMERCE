"use server"

import { cookies } from "next/headers"
import type { OrdersResponse } from "./get-admin-orders"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "https://mizizzi-ecommerce-1.onrender.com"

/**
 * Server action to fetch admin orders with token from cookies
 * This enables true SSR for the orders page
 */
export async function fetchOrdersSSR(params?: {
  page?: number
  per_page?: number
  search?: string
}): Promise<OrdersResponse> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("admin_token")?.value

    if (!token) {
      console.log("[v0] fetchOrdersSSR: No admin token in cookies")
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

    if (params?.page) url.searchParams.append("page", params.page.toString())
    if (params?.per_page) url.searchParams.append("per_page", params.per_page.toString())
    if (params?.search) url.searchParams.append("search", params.search)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error("[v0] fetchOrdersSSR: API returned status", response.status)
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
    return data || {
      items: [],
      pagination: {
        total_pages: 1,
        total_items: 0,
        current_page: 1,
      },
    }
  } catch (error) {
    console.error("[v0] fetchOrdersSSR: Error:", error)
    return {
      items: [],
      pagination: {
        total_pages: 1,
        total_items: 0,
        current_page: 1,
      },
    }
  }
}
