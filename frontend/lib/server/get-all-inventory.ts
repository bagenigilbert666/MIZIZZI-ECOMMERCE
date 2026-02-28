import type { EnhancedInventoryItem } from "@/services/inventory-service"
import { calculateInventoryStats, type InventoryStats } from "./calculate-inventory-stats"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://mizizzi-ecommerce-1.onrender.com"
const ADMIN_INVENTORY_BASE = "/api/inventory/admin"
const PUBLIC_INVENTORY_BASE = "/api/inventory"

export interface InventoryResponse {
  items: EnhancedInventoryItem[]
  stats: InventoryStats
  error?: string
}

/**
 * Server-side function to fetch all inventory with statistics
 * This runs on the server before the page is sent to the browser
 * Uses caching with ISR (Incremental Static Regeneration)
 * Returns both inventory items and pre-calculated statistics
 * 
 * Note: Due to authentication requirements on the admin endpoint,
 * this function attempts both public and admin endpoints.
 */
export async function getAllInventory(limit = 10000, page = 1): Promise<InventoryResponse> {
  try {
    // Build the URL with query parameters
    const params = new URLSearchParams()
    params.append("page", page.toString())
    params.append("per_page", limit.toString())
    params.append("include_product_details", "true")
    
    // Try admin endpoint first (requires auth, will fail on SSR)
    const adminEndpoint = `${API_BASE_URL}${ADMIN_INVENTORY_BASE}/?${params.toString()}`
    
    console.log("[v0] getAllInventory: Attempting admin endpoint:", adminEndpoint)
    
    const response = await attemptFetch(adminEndpoint, 5000)
    
    if (response?.ok) {
      return await parseInventoryResponse(response)
    }
    
    // If admin endpoint fails with 401, try public endpoint
    if (response?.status === 401) {
      console.log("[v0] getAllInventory: Admin endpoint requires auth, trying public endpoint")
      const publicEndpoint = `${API_BASE_URL}${PUBLIC_INVENTORY_BASE}/?${params.toString()}`
      const publicResponse = await attemptFetch(publicEndpoint, 5000)
      
      if (publicResponse?.ok) {
        return await parseInventoryResponse(publicResponse)
      }
    }
    
    // Return empty response with zero stats
    return {
      items: [],
      stats: {
        total_items: 0,
        in_stock: 0,
        low_stock: 0,
        out_of_stock: 0,
        total_value: 0,
        reserved_quantity: 0,
        needs_reorder: 0,
      },
      error: "Failed to fetch inventory data",
    }
  } catch (error) {
    console.error("[v0] getAllInventory: Critical error:", error)
    return {
      items: [],
      stats: {
        total_items: 0,
        in_stock: 0,
        low_stock: 0,
        out_of_stock: 0,
        total_value: 0,
        reserved_quantity: 0,
        needs_reorder: 0,
      },
      error: "Critical error fetching inventory",
    }
  }
}

/**
 * Helper function to attempt a fetch with timeout and caching
 */
async function attemptFetch(url: string, timeoutMs: number): Promise<Response | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    const response = await fetch(url, {
      signal: controller.signal,
      next: {
        revalidate: 60, // Cache for 60 seconds on the server (ISR)
        tags: ["all-inventory"], // Tag for on-demand revalidation
      },
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    })

    clearTimeout(timeoutId)
    return response
  } catch (err: any) {
    if (err?.name === "AbortError") {
      console.warn("[v0] getAllInventory: Request timeout after", timeoutMs, "ms")
    } else {
      console.error("[v0] getAllInventory: Fetch failed:", err?.message || String(err))
    }
    return null
  }
}

/**
 * Helper function to parse inventory response from backend
 */
async function parseInventoryResponse(response: Response): Promise<InventoryResponse> {
  try {
    const data = await response.json()
    
    console.log("[v0] getAllInventory: Response status:", response.status)
    console.log("[v0] getAllInventory: Response structure -", {
      hasSuccess: !!data?.success,
      hasInventory: !!data?.inventory,
      inventoryLength: Array.isArray(data?.inventory) ? data.inventory.length : 0,
      hasData: !!data?.data,
      dataLength: Array.isArray(data?.data) ? data.data.length : 0,
    })
    
    // Parse the response according to the backend structure
    let items: EnhancedInventoryItem[] = []
    
    if (data?.success && data?.inventory && Array.isArray(data.inventory)) {
      items = parseInventoryItems(data.inventory)
    } else if (Array.isArray(data?.data)) {
      items = parseInventoryItems(data.data)
    } else if (Array.isArray(data)) {
      items = parseInventoryItems(data)
    }
    
    // Calculate stats server-side for instant display
    const stats = calculateInventoryStats(items)
    
    console.log("[v0] getAllInventory: Successfully fetched", items.length, "items")
    
    return {
      items,
      stats,
    }
  } catch (err) {
    console.error("[v0] getAllInventory: Error parsing response:", err)
    return {
      items: [],
      stats: {
        total_items: 0,
        in_stock: 0,
        low_stock: 0,
        out_of_stock: 0,
        total_value: 0,
        reserved_quantity: 0,
        needs_reorder: 0,
      },
      error: "Error parsing inventory response",
    }
  }
}

/**
 * Helper function to parse and map inventory items
 */
function parseInventoryItems(items: any[]): EnhancedInventoryItem[] {
  return items.map((item: any) => ({
    ...item,
    is_in_stock: (item.available_quantity ?? 0) > 0,
    is_low_stock: 
      (item.available_quantity ?? 0) > 0 && 
      (item.available_quantity ?? 0) <= (item.low_stock_threshold ?? 5),
    available_quantity: Math.max(0, (item.stock_level || 0) - (item.reserved_quantity || 0)),
    product: item.product
      ? {
          id: item.product.id,
          name: item.product.name,
          slug: item.product.slug,
          price: item.product.price,
          sale_price: item.product.sale_price,
          thumbnail_url: item.product.thumbnail_url || (item.product.image_urls && item.product.image_urls[0]),
          image_urls: item.product.image_urls || [],
          category: item.product.category,
          brand: item.product.brand,
          sku: item.product.sku,
        }
      : undefined,
  }))
}
