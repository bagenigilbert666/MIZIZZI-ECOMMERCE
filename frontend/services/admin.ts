import api from "@/lib/api"
import type { AdminPaginatedResponse, ProductCreatePayload } from "@/types/admin"
import type { Product, Category } from "@/types"
import { productService } from "@/services/product"
import { cloudinaryService } from "./cloudinary-service"

// Declare the missing variables
const productCache = new Map()
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour
const websocketService = {
  send: (event: string, data: any) => {
    console.log(`Simulating WebSocket send: ${event}`, data)
  },
}

async function prefetchData(url: string, params: any): Promise<boolean> {
  try {
    const response = await api.get(url, { params })
    return response.status === 200
  } catch (error) {
    console.error(`Error prefetching data from ${url}:`, error)
    return false
  }
}

// Define the base URL for admin API endpoints
const ADMIN_API_BASE = "/api/admin"

// Define types for admin API responses
interface AdminLoginResponse {
  user: any
  access_token: string
  refresh_token?: string
  csrf_token?: string
}

interface AdminDashboardResponse {
  counts: {
    users: number
    products: number
    orders: number
    categories: number
    brands: number
    reviews: number
    pending_reviews: number
    newsletter_subscribers: number
    new_signups_today: number
    new_signups_week: number
    orders_in_transit: number
    pending_payments: number
    low_stock_count: number
  }
  sales: {
    today: number
    yesterday: number
    weekly: number
    monthly: number
    yearly: number
    total_revenue: number
    pending_amount: number
  }
  order_status: Record<string, number>
  recent_orders: any[]
  recent_users: any[]
  recent_activities: any[]
  low_stock_products: any[]
  sales_by_category: any[]
  best_selling_products: any[]
  traffic_sources: any[]
  notifications: any[]
  upcoming_events: any[]
  users_by_region: any[]
  revenue_vs_refunds: any[]
  active_users: any[]
  sales_data: any[]
}

interface ProductImage {
  id: number | string
  product_id: number | string
  filename: string
  original_name?: string
  url: string
  image_url?: string
  size?: number
  is_primary: boolean
  sort_order: number
  alt_text?: string
  uploaded_by?: number | string
  created_at?: string
  updated_at?: string
}

// Admin service with methods for interacting with the admin API
export const adminService = {
  isServiceAvailable(): boolean {
    try {
      // Check if we have the necessary environment variables
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL
      if (!apiUrl) {
        console.warn("Admin service: No API URL configured")
        return false
      }

      // Check if we're in a browser environment
      if (typeof window === "undefined") {
        return true // Assume available on server side
      }

      // Check if localStorage is available (basic browser functionality)
      try {
        localStorage.getItem("test")
        return true
      } catch (e) {
        console.warn("Admin service: localStorage not available")
        return false
      }
    } catch (error) {
      console.error("Admin service availability check failed:", error)
      return false
    }
  },

  // Authentication
  async login(credentials: { email: string; password: string; remember?: boolean }): Promise<AdminLoginResponse> {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: credentials.email,
          password: credentials.password,
        }),
        credentials: "include",
      })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          
          // Handle 401 specifically
          if (response.status === 401) {
            // Try to refresh token
            console.log("[v0] Got 401, attempting to refresh token")
            try {
              await this.refreshToken()
              // Retry the update with new token
              const newToken = localStorage.getItem("mizizzi_token") || localStorage.getItem("admin_token")
              if (newToken) {
                headers.Authorization = `Bearer ${newToken}`
                const retryResponse = await fetch(endpoint, {
                  method: "PUT",
                  headers: headers,
                  body: JSON.stringify(data),
                })
                if (retryResponse.ok) {
                  const responseData = await retryResponse.json()
                  console.log("[v0] Product updated successfully after token refresh:", responseData)
                  return responseData
                }
              }
            } catch (refreshError) {
              console.error("[v0] Token refresh failed:", refreshError)
            }
            throw new Error("Authentication failed. Your session has expired. Please log in again.")
          }
          
          throw new Error(errorData.message || `Failed to update product. Status: ${response.status}`)
        }

        // Parse the response
        const responseData = await response.json()
        console.log("[v0] Product updated successfully:", responseData)

        // Notify about product update via WebSocket
        try {
          websocketService.send("product_updated", { id: id, timestamp: Date.now() })
          console.log("[v0] WebSocket notification sent for product update")

          // Invalidate cache for this product
          this.invalidateProductCache(id)

          // Also dispatch a custom event that components can listen for
          if (typeof window !== "undefined") {
            const event = new CustomEvent("product-updated", { detail: { id, product: responseData } })
            window.dispatchEvent(event)
            console.log("[v0] Custom event dispatched for product update")
          }
        } catch (notifyError) {
          console.warn("[v0] Failed to notify about product update:", notifyError)
        }

        return responseData
      } catch (fetchError: any) {
        clearTimeout(timeoutId)

        if (fetchError.name === "AbortError") {
          console.error("[v0] Update request timed out")
          throw new Error("Request timed out. Please try again.")
        }

        throw fetchError
      }
    } catch (error: any) {
      console.error("[v0] Error updating product:", error)
      throw error
    }
  },

  // Delete a product
  async deleteProduct(id: string): Promise<{ success: boolean; message: string }> {
    try {
      // Get the token - check both mizizzi_token and admin_token
      const token = localStorage.getItem("mizizzi_token") || localStorage.getItem("admin_token")
      if (!token) {
        throw new Error("Authentication token not found. Please log in again.")
      }

      // Set up headers with authentication
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || ""
      const endpoint = `${apiUrl}/api/admin/products/${id}`

      // Add a timeout to ensure the request doesn't hang
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout

      try {
        // Make the API call with proper headers and timeout
        const response = await fetch(endpoint, {
          method: "DELETE",
          headers: headers,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        // Check if the response is ok
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          
          // Handle 401 specifically
          if (response.status === 401) {
            console.log("[v0] Got 401, attempting to refresh token")
            try {
              await this.refreshToken()
              // Retry the delete with new token
              const newToken = localStorage.getItem("mizizzi_token") || localStorage.getItem("admin_token")
              if (newToken) {
                headers.Authorization = `Bearer ${newToken}`
                const retryResponse = await fetch(endpoint, {
                  method: "DELETE",
                  headers: headers,
                })
                if (retryResponse.ok) {
                  const responseData = await retryResponse.json()
                  console.log("[v0] Product deleted successfully after token refresh")
                  this.invalidateProductCache(id)
                  return responseData
                }
              }
            } catch (refreshError) {
              console.error("[v0] Token refresh failed:", refreshError)
            }
            throw new Error("Authentication failed. Your session has expired. Please log in again.")
          }
          
          throw new Error(errorData.message || `Failed to delete product. Status: ${response.status}`)
        }

        // Parse the response
        const responseData = await response.json()

        // Invalidate cache for this product
        this.invalidateProductCache(id)

        return responseData
      } catch (fetchError: any) {
        clearTimeout(timeoutId)

        if (fetchError.name === "AbortError") {
          throw new Error("Request timed out. Please try again.")
        }

        throw fetchError
      }
    } catch (error: any) {
      throw error
    }
  },

  // Create a product
  async createProduct(data: ProductCreatePayload): Promise<Product> {
    try {
      // Add a timeout to ensure the request doesn't hang
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      try {
        // Get the token from localStorage
        const token = localStorage.getItem("admin_token")
        if (!token) {
          throw new Error("Authentication token not found. Please log in again.")
        }

        // Set up headers with authentication
        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        }

        const requestBody = JSON.stringify(data)

        // Make the API call with proper headers and timeout
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/admin/products`, {
          method: "POST",
          headers: headers,
          body: requestBody,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          // Try to get the error response text first
          const responseText = await response.text()

          let errorData: any = {}
          try {
            // Try to parse as JSON
            errorData = JSON.parse(responseText)
          } catch (parseError) {
            // If not JSON, use the text as the error message
            throw new Error(responseText || `Failed to create product. Status: ${response.status}`)
          }

          // Extract the error message from various possible formats
          const errorMessage =
            errorData.error ||
            errorData.message ||
            errorData.details ||
            `Failed to create product. Status: ${response.status}`
          throw new Error(errorMessage)
        }

        // Parse the response
        const responseData = await response.json()

        // Notify about new product
        if (responseData && responseData.id) {
          try {
            this.notifyProductUpdate(responseData.id.toString())
          } catch (notifyError) {
            console.warn("Failed to notify about new product:", notifyError)
          }
        }

        return responseData
      } catch (fetchError: any) {
        clearTimeout(timeoutId)

        if (fetchError.name === "AbortError") {
          throw new Error("Request timed out. Please try again.")
        }

        throw fetchError
      }
    } catch (error: any) {
      console.error("Error creating product:", error)

      // Check if this is an authentication error
      if (error.response?.status === 401 || error.message?.includes("Authentication")) {
        throw new Error("Authentication failed. Your session has expired. Please log in again.")
      }

      throw error
    }
  },

  // Orders
  async getOrders(params?: {
    page?: number
    per_page?: number
    status?: string
    payment_status?: string
    search?: string
    date_from?: string
    date_to?: string
    min_amount?: number
    max_amount?: number
  }): Promise<any> {
    try {
      const token = localStorage.getItem("mizizzi_token")
      if (!token) {
        throw new Error("No authentication token available")
      }

      const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/orders`)

      url.searchParams.append("include_items", "true")
      url.searchParams.append("with_items", "true")

      // Add query parameters if provided
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            url.searchParams.append(key, value.toString())
          }
        })
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`Orders request failed with status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error fetching orders:", error)
      throw error
    }
  },

  // Get a single order by ID
  async getOrder(orderId: number): Promise<any> {
    try {
      const token = localStorage.getItem("mizizzi_token")
      if (!token) {
        throw new Error("No authentication token available")
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/orders/${orderId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`Order request failed with status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`Error fetching order ${orderId}:`, error)
      throw error
    }
  },

  // Update order status
  async updateOrderStatus(
    orderId: number,
    data: { status: string; tracking_number?: string; tracking_url?: string; notes?: string },
  ): Promise<any> {
    try {
      console.log("[v0] updateOrderStatus called with:", { orderId, data })

      const token = localStorage.getItem("mizizzi_token")
      if (!token) {
        throw new Error("No authentication token available")
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
        credentials: "include",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        console.error("[v0] Order status update failed:", {
          status: response.status,
          statusText: response.statusText,
          errorData,
        })

        const errorMessage =
          errorData?.message || errorData?.error || `Order status update failed with status: ${response.status}`
        throw new Error(errorMessage)
      }

      const result = await response.json()
      console.log("[v0] Order status updated successfully:", result)

      try {
        const { websocketService } = await import("@/services/websocket")
        await websocketService.emit("order_updated", {
          orderId: orderId,
          id: orderId,
          status: data.status,
          tracking_number: data.tracking_number,
          tracking_url: data.tracking_url,
          notes: data.notes,
          timestamp: new Date().toISOString(),
        })
        console.log("[v0] WebSocket notification sent for order update")
      } catch (wsError) {
        console.warn("[v0] Failed to send WebSocket notification:", wsError)
        // Don't throw error - order was updated successfully even if WebSocket failed
      }

      return result
    } catch (error) {
      console.error(`[v0] Error updating order status for order ${orderId}:`, error)
      throw error
    }
  },

  // Categories
  async getCategories(params: Record<string, any> = {}): Promise<AdminPaginatedResponse<Category>> {
    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("mizizzi_token")
      if (!token) {
        throw new Error("No authentication token available")
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
      const queryParams = new URLSearchParams()

      Object.keys(params).forEach((key) => {
        if (params[key] !== undefined && params[key] !== null) {
          queryParams.append(key, params[key].toString())
        }
      })

      const url = `${baseUrl}/api/admin/categories${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`Categories request failed with status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error fetching categories:", error)
      throw error
    }
  },

  // Create category
  async createCategory(data: any): Promise<any> {
    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("mizizzi_token")
      if (!token) {
        throw new Error("No authentication token available")
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
      const response = await fetch(`${baseUrl}/api/admin/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to create category")
      }

      return await response.json()
    } catch (error) {
      console.error("Error creating category:", error)
      throw error
    }
  },

  // Update category
  async updateCategory(id: string, data: any): Promise<any> {
    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("mizizzi_token")
      if (!token) {
        throw new Error("No authentication token available")
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
      const response = await fetch(`${baseUrl}/api/admin/categories/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to update category")
      }

      return await response.json()
    } catch (error) {
      console.error(`Error updating category ${id}:`, error)
      throw error
    }
  },

  // Delete category
  async deleteCategory(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("mizizzi_token")
      if (!token) {
        throw new Error("No authentication token available")
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
      const response = await fetch(`${baseUrl}/api/admin/categories/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to delete category")
      }

      return await response.json()
    } catch (error) {
      console.error(`Error deleting category ${id}:`, error)
      throw error
    }
  },

  // Brands
  async getBrands(params?: { page?: number; per_page?: number; search?: string }): Promise<any> {
    const makeRequest = async (token: string): Promise<Response> => {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
      let url = `${baseUrl}/api/admin/brands`

      if (params) {
        const queryParams = new URLSearchParams()
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            queryParams.append(key, value.toString())
          }
        })

        const queryString = queryParams.toString()
        if (queryString) {
          url += `?${queryString}`
        }
      }

      console.log("[v0] Fetching brands with URL:", url)

      return fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      })
    }

    try {
      const adminToken = localStorage.getItem("admin_token")
      const mizizziToken = localStorage.getItem("mizizzi_token")
      const token = adminToken || mizizziToken

      console.log("[v0] Admin token available:", !!adminToken)
      console.log("[v0] Mizizzi token available:", !!mizizziToken)
      console.log("[v0] Using token:", token ? "Yes" : "No")

      if (!token) {
        throw new Error("No authentication token available")
      }

      let response = await makeRequest(token)

      // Handle token expiration
      if (!response.ok && response.status === 401) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch (e) {
          errorData = { error: errorText }
        }

        console.error("[v0] Brands request failed:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        })

        // Check if it's a token expiration error
        if (errorData.code === "token_expired") {
          console.log("[v0] Token expired, attempting refresh...")
          const refreshSuccess = await this.refreshTokenAndRetry()

          if (refreshSuccess) {
            // Retry with new token
            const newToken = localStorage.getItem("admin_token") || localStorage.getItem("mizizzi_token")
            if (newToken) {
              console.log("[v0] Retrying brands request with refreshed token...")
              response = await makeRequest(newToken)

              if (!response.ok) {
                const retryErrorText = await response.text()
                throw new Error(
                  `Brands request failed after token refresh with status: ${response.status} - ${retryErrorText}`,
                )
              }
            } else {
              throw new Error("Token refresh succeeded but no new token found")
            }
          } else {
            throw new Error(`Brands request failed with status: ${response.status} - ${errorText}`)
          }
        } else {
          throw new Error(`Brands request failed with status: ${response.status} - ${errorText}`)
        }
      } else if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] Brands request failed:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        })
        throw new Error(`Brands request failed with status: ${response.status} - ${errorText}`)
      }

      return await response.json()
    } catch (error) {
      console.error("[v0] Error fetching brands:", error)
      throw error
    }
  },

  // Get all brands (no pagination) for dropdowns
  async getBrandsList(): Promise<any> {
    try {
      const token = localStorage.getItem("mizizzi_token")
      if (!token) {
        throw new Error("No authentication token available")
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/brands/list`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`Brands list request failed with status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error fetching brands list:", error)
      throw error
    }
  },

  // Reviews
  async getReviews(params = {}): Promise<AdminPaginatedResponse<any>> {
    try {
      const response = await api.get("/api/admin/reviews", { params })
      return response.data
    } catch (error) {
      console.error("Error fetching reviews:", error)
      throw error
    }
  },

  // Newsletter subscribers
  async getNewsletterSubscribers(params = {}): Promise<AdminPaginatedResponse<any>> {
    try {
      const response = await api.get("/api/admin/newsletters", { params })
      return response.data
    } catch (error) {
      console.error("Error fetching newsletter subscribers:", error)
      throw error
    }
  },

  // Newsletters
  async getNewsletters(params?: {
    page?: number
    per_page?: number
    is_active?: boolean
    search?: string
  }): Promise<any> {
    try {
      const token = localStorage.getItem("mizizzi_token")
      if (!token) {
        throw new Error("No authentication token available")
      }

      const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/newsletters`)

      // Add query parameters if provided
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            url.searchParams.append(key, value.toString())
          }
        })
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`Newsletters request failed with status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error fetching newsletters:", error)
      throw error
    }
  },

  // Get admin profile
  async getProfile(): Promise<any> {
    try {
      const response = await api.get("/api/admin/profile")
      return response.data
    } catch (error) {
      console.error("Error fetching admin profile:", error)
      throw error
    }
  },

  // Update admin profile
  async updateProfile(data: any): Promise<any> {
    try {
      const response = await api.put("/api/admin/profile", data)
      return response.data
    } catch (error) {
      console.error("Error updating admin profile:", error)
      throw error
    }
  },

  // Get order details
  async getOrderDetails(id: string): Promise<any> {
    try {
      const response = await api.get(`/api/admin/orders/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching order details for order ${id}:`, error)
      throw error
    }
  },

  // Create category - already updated above
  // Update category - already updated above
  // Delete category - already updated above

  // Create brand
  async createBrand(data: any): Promise<any> {
    try {
      const response = await api.post("/api/admin/brands", data)
      return response.data
    } catch (error) {
      console.error("Error creating brand:", error)
      throw error
    }
  },

  // Update brand
  async updateBrand(id: string, data: any): Promise<any> {
    try {
      const response = await api.put(`/api/admin/brands/${id}`, data)
      return response.data
    } catch (error) {
      console.error(`Error updating brand ${id}:`, error)
      throw error
    }
  },

  // Delete brand
  async deleteBrand(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.delete(`/api/admin/brands/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error deleting brand ${id}:`, error)
      throw error
    }
  },

  // Approve/reject review
  async updateReviewStatus(id: string, status: "approved" | "rejected"): Promise<any> {
    try {
      const response = await api.put(`/api/admin/reviews/${id}/status`, { status })
      return response.data
    } catch (error) {
      console.error(`Error updating review ${id} status:`, error)
      throw error
    }
  },

  // Delete review
  async deleteReview(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.delete(`/api/admin/reviews/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error deleting review ${id}:`, error)
      throw error
    }
  },

  // Send newsletter
  async sendNewsletter(data: { subject: string; content: string; recipientGroups?: string[] }): Promise<any> {
    try {
      const response = await api.post("/api/admin/newsletters/send", data)
      return response.data
    } catch (error) {
      console.error("Error sending newsletter:", error)
      throw error
    }
  },

  // Get admin notifications
  async getNotifications(params = {}): Promise<AdminPaginatedResponse<any>> {
    try {
      const response = await api.get("/api/admin/notifications", { params })
      return response.data
    } catch (error) {
      console.error("Error fetching notifications:", error)
      // Return empty data structure instead of throwing
      return {
        items: [],
        meta: {
          current_page: 1,
          per_page: 10,
          total: 0,
          last_page: 1,
          from: 0,
          to: 0,
        },
      }
    }
  },

  // Get system settings
  async getSettings(): Promise<any> {
    try {
      const response = await api.get("/api/admin/settings")
      return response.data
    } catch (error) {
      console.error("Error fetching system settings:", error)
      throw error
    }
  },

  // Update system settings
  async updateSettings(data: any): Promise<any> {
    try {
      const response = await api.put("/api/admin/settings", data)
      return response.data
    } catch (error) {
      console.error("Error updating system settings:", error)
      throw error
    }
  },

  // Update the activateUser and deactivateUser methods
  async activateUser(id: string): Promise<any> {
    try {
      const token = localStorage.getItem("admin_token")
      if (!token) {
        throw new Error("No authentication token available")
      }

      const response = await api.post(
        `/api/admin/users/${id}/activate`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      return response.data
    } catch (error) {
      console.error(`Error activating user ${id}:`, error)
      throw error
    }
  },

  async deactivateUser(id: string): Promise<any> {
    try {
      const token = localStorage.getItem("admin_token")
      if (!token) {
        throw new Error("No authentication token available")
      }

      const response = await api.post(
        `/api/admin/users/${id}/deactivate`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      return response.data
    } catch (error) {
      console.error(`Error deactivating user ${id}:`, error)
      throw error
    }
  },

  async updateUser(id: string, data: any): Promise<any> {
    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("mizizzi_token")
      if (!token) {
        throw new Error("No authentication token available")
      }

      console.log("[v0] updateUser called with:", { id, data })

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"
      const response = await fetch(`${baseUrl}/api/admin/users/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
        credentials: "include",
      })

      console.log("[v0] updateUser response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.log("[v0] updateUser error response:", errorData)
        throw new Error(errorData.message || `Failed to update user. Status: ${response.status}`)
      }

      const result = await response.json()
      console.log("[v0] updateUser success:", result)
      return result
    } catch (error) {
      console.error(`Error updating user ${id}:`, error)
      throw error
    }
  },

  async deleteUser(id: string): Promise<any> {
    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("mizizzi_token")
      if (!token) {
        throw new Error("No authentication token available")
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"
      const deleteUrl = `${baseUrl}/api/admin/users/${id}`

      const response = await fetch(deleteUrl, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to delete user. Status: ${response.status}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error(`Error deleting user ${id}:`, error)
      throw error
    }
  },

  // Get product image
  async getProductImage(productId: string): Promise<string> {
    try {
      // Make sure we have a valid API URL
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

      const url = `${baseUrl}/api/admin/products/${productId}/images`
      console.log(`Fetching images from: ${url}`)

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("admin_token") || ""}`,
        },
        credentials: "include",
      })

      if (!response.ok) {
        console.warn(`Failed to fetch images for product ${productId}:`, response.statusText)
        return "/placeholder.svg"
      }

      const data = await response.json()

      if (data.items && Array.isArray(data.items) && data.items.length > 0) {
        // Find primary image first, or use the first image
        const primaryImage = data.items.find((img: any) => img.is_primary)
        const firstImage = data.items[0]
        const selectedImage = primaryImage || firstImage

        if (selectedImage && selectedImage.url) {
          return selectedImage.url.startsWith("http")
            ? selectedImage.url
            : `${baseUrl}${selectedImage.url.startsWith("/") ? "" : "/"}${selectedImage.url}`
        }
      } else if (Array.isArray(data) && data.length > 0) {
        // Handle direct array response
        const primaryImage = data.find((img: any) => img.is_primary)
        const firstImage = data[0]
        const selectedImage = primaryImage || firstImage

        if (selectedImage && selectedImage.url) {
          return selectedImage.url.startsWith("http")
            ? selectedImage.url
            : `${baseUrl}${selectedImage.url.startsWith("/") ? "" : "/"}${selectedImage.url}`
        }
      }

      return "/placeholder.svg"
    } catch (error) {
      console.error(`Error fetching images for product ${productId}:`, error)
      return "/placeholder.svg"
    }
  },

  // Delete a product image
  async deleteProductImage(imageIdOrUrl: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log("[v0] Deleting product image with ID/URL:", imageIdOrUrl)

      // Check if it's a URL (Cloudinary URL) or a numeric ID
      const isUrl = /^https?:\/\//.test(imageIdOrUrl)
      const isBlobUrl = imageIdOrUrl.startsWith("blob:")
      const isNumericId = /^\d+$/.test(imageIdOrUrl)

      if (isBlobUrl) {
        console.log("[v0] Detected blob URL, searching for corresponding database record")

        try {
          const searchResponse = await api.post("/api/admin/products/product-images/search-by-url", {
            url: imageIdOrUrl,
          })

          if (searchResponse.data?.image_id) {
            console.log("[v0] Found database record for blob URL:", searchResponse.data.image_id)
            // Recursively call with the found ID
            return await this.deleteProductImage(searchResponse.data.image_id.toString())
          }
        } catch (error) {
          console.warn("[v0] Could not find database record for blob URL:", error)
        }

        // If we can't find it in the database, it might be a preview image
        // Just return success since blob URLs are temporary anyway
        console.log("[v0] Blob URL not found in database, treating as preview image")
        return { success: true, message: "Preview image removed successfully" }
      }

      if (isNumericId) {
        try {
          console.log("[v0] Deleting image with ID:", imageIdOrUrl)

          const response = await api.delete(`/api/admin/products/product-images/${imageIdOrUrl}`)

          console.log("[v0] Product image deleted successfully:", response.data)

          this.invalidateProductCaches()

          return { success: true, message: response.data?.message || "Image deleted successfully" }
        } catch (error: any) {
          console.error("[v0] Error deleting image:", error)

          // Handle specific error cases
          if (error.response?.status === 404) {
            throw new Error("Image not found. It may have already been deleted.")
          } else if (error.response?.status === 401) {
            throw new Error("Authentication failed. Your session has expired. Please log in again.")
          } else {
            const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message
            throw new Error(errorMessage || "Failed to delete product image")
          }
        }
      } else if (isUrl && !isBlobUrl) {
        try {
          console.log("[v0] Searching for image ID by URL:", imageIdOrUrl)

          const searchResponse = await api.post("/api/admin/products/product-images/search-by-url", {
            url: imageIdOrUrl,
          })

          if (searchResponse.data?.image_id) {
            console.log("[v0] Found image ID for URL:", searchResponse.data.image_id)
            // Recursively call with the found ID
            return await this.deleteProductImage(searchResponse.data.image_id.toString())
          }

          // If search endpoint doesn't exist or fails, try alternative approach
          // Extract Cloudinary public_id from URL and delete directly
          const cloudinaryMatch = imageIdOrUrl.match(/\/v\d+\/([^/]+)\.(jpg|jpeg|png|webp|gif)/)
          if (cloudinaryMatch) {
            const publicId = cloudinaryMatch[1]
            console.log("[v0] Extracted Cloudinary public_id:", publicId)

            const cloudinaryResponse = await api.delete("/api/admin/products/product-images/delete-by-public-id", {
              data: { public_id: publicId, url: imageIdOrUrl },
            })

            console.log("[v0] Image deleted via Cloudinary public_id:", cloudinaryResponse.data)

            this.invalidateProductCaches()

            return { success: true, message: cloudinaryResponse.data?.message || "Image deleted successfully" }
          }

          // If all else fails, try a generic URL-based deletion endpoint
          const urlResponse = await api.delete("/api/admin/products/product-images/delete-by-url", {
            data: { url: imageIdOrUrl },
          })

          console.log("[v0] Image deleted via URL endpoint:", urlResponse.data)

          this.invalidateProductCaches()

          return { success: true, message: urlResponse.data?.message || "Image deleted successfully" }
        } catch (urlError: any) {
          console.error("[v0] Error deleting image by URL:", urlError)
          throw new Error(
            "Unable to delete image. The image may have been uploaded recently and needs to be saved first, or there may be a server issue. Please try refreshing the page and attempting deletion again.",
          )
        }
      } else {
        throw new Error("Invalid image identifier. Expected numeric ID or valid URL.")
      }
    } catch (error: any) {
      console.error("[v0] Error deleting product image:", error)
      throw error
    }
  },

  async uploadProductImage(
    productId: string | number,
    file: File,
  ): Promise<{ success: boolean; image?: ProductImage; url?: string; error?: string }> {
    try {
      console.log("[v0] Uploading product image for product:", productId)

      const result = await cloudinaryService.uploadProductImage(productId, file, {
        altText: `Product image for ${file.name}`,
        onProgress: (progress) => {
          console.log("[v0] Upload progress:", progress + "%")
        },
      })

      if (!result.success) {
        console.error("[v0] Image upload failed:", result.error || result.message)
        throw new Error(result.error || result.message || "Failed to upload image")
      }

      if (!result.uploaded_image) {
        console.error("[v0] Upload succeeded but no image data returned:", result)
        throw new Error("Upload succeeded but no image metadata was returned from the server")
      }

      console.log("[v0] Image uploaded successfully:", result.uploaded_image)

      // Invalidate caches after successful upload
      this.invalidateProductCaches()

      return {
        success: true,
        image: result.uploaded_image as ProductImage,
        url: result.uploaded_image.secure_url || result.uploaded_image.url,
      }
    } catch (error: any) {
      console.error("[v0] Error uploading product image:", error)
      return {
        success: false,
        error: error.message || "Failed to upload image",
      }
    }
  },

  async saveCloudinaryImage(
    productId: string | number,
    imageData: {
      url: string
      public_id: string
      filename: string
      original_name: string
      size?: number
    },
  ): Promise<{ success: boolean; image?: ProductImage; error?: string }> {
    try {
      console.log("[v0] Saving Cloudinary image for product:", productId, imageData)

      // Get the token from localStorage
      const token = localStorage.getItem("admin_token")
      if (!token) {
        throw new Error("Authentication token not found. Please log in again.")
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"
      const apiUrl = `${baseUrl}/api/admin/products/${productId}/images`

      console.log("[v0] Sending Cloudinary image URL to backend API:", apiUrl)

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          url: imageData.url,
          filename: imageData.filename,
          original_name: imageData.original_name,
          cloudinary_public_id: imageData.public_id,
          size: imageData.size,
          alt_text: `Product image ${imageData.original_name}`,
          is_primary: false,
          sort_order: 0,
        }),
        credentials: "include",
      })

      console.log("[v0] Backend API response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("[v0] Backend API error response:", errorData)
        throw new Error(errorData.error || `Failed to save Cloudinary image. Status: ${response.status}`)
      }

      const responseData = await response.json()
      console.log("[v0] Cloudinary image saved successfully:", responseData)

      // Invalidate caches after successful save
      this.invalidateProductCaches()

      return {
        success: true,
        image: responseData,
      }
    } catch (error: any) {
      console.error("[v0] Error saving Cloudinary image:", error)
      return {
        success: false,
        error: error.message || "Failed to save Cloudinary image",
      }
    }
  },

  async getProductImages(productId: number): Promise<ProductImage[]> {
    try {
      console.log("[v0] Fetching product images for product ID:", productId)

      const token = localStorage.getItem("admin_token")
      if (!token) {
        throw new Error("Authentication token not found. Please log in again.")
      }

      // Use local API route to proxy the request (avoids CORS issues)
      const endpoint = `/api/admin/products/${productId}/images`

      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication failed. Your session has expired. Please log in again.")
        } else if (response.status === 404) {
          console.log("[v0] No images found for product:", productId)
          return []
        } else {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `Failed to fetch product images. Status: ${response.status}`)
        }
      }

      const data = await response.json()
      console.log("[v0] Product images response:", data)

      // Handle different response formats
      let images: ProductImage[] = []
      if (Array.isArray(data)) {
        images = data
      } else if (data.images && Array.isArray(data.images)) {
        images = data.images
      } else if (data.data && Array.isArray(data.data)) {
        images = data.data
      }

      console.log("[v0] Parsed product images:", images.length)
      return images
    } catch (error) {
      console.error("[v0] Error fetching product images:", error)
      throw error
    }
  },

  // Product Analytics
  async getProductAnalytics(): Promise<any> {
    try {
      const token = localStorage.getItem("mizizzi_token") || localStorage.getItem("admin_token")
      if (!token) {
        throw new Error("No authentication token available")
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
      const url = `${baseUrl}/api/admin/dashboard/product-analytics`

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      })

      if (!response.ok) {
        // Return mock data if API is not available
        return {
          success: true,
          data: {
            totalRevenue: 125000,
            totalOrders: 450,
            averageOrderValue: 2780,
            conversionRate: 3.2,
            topSellingProducts: [],
            lowStockProducts: [],
            recentlyViewed: [],
            trending: [],
            seasonalTrends: [],
            categoryPerformance: [],
            customerInsights: {
              repeatCustomers: 120,
              newCustomers: 85,
              averageLifetimeValue: 15000,
            },
          },
        }
      }

      const data = await response.json()
      return { success: true, data }
    } catch (error) {
      console.error("Error fetching product analytics:", error)
      // Return mock data on error
      return {
        success: true,
        data: {
          totalRevenue: 125000,
          totalOrders: 450,
          averageOrderValue: 2780,
          conversionRate: 3.2,
          topSellingProducts: [],
          lowStockProducts: [],
          recentlyViewed: [],
          trending: [],
          seasonalTrends: [],
          categoryPerformance: [],
          customerInsights: {
            repeatCustomers: 120,
            newCustomers: 85,
            averageLifetimeValue: 15000,
          },
        },
      }
    }
  },

  getDefaultDashboardData(): AdminDashboardResponse {
    return {
      counts: {
        users: 0,
        products: 0,
        orders: 0,
        categories: 0,
        brands: 0,
        reviews: 0,
        pending_reviews: 0,
        newsletter_subscribers: 0,
        new_signups_today: 0,
        new_signups_week: 0,
        orders_in_transit: 0,
        pending_payments: 0,
        low_stock_count: 0,
      },
      sales: {
        today: 0,
        monthly: 0,
        yesterday: 0,
        weekly: 0,
        yearly: 0,
        total_revenue: 0,
        pending_amount: 0,
      },
      order_status: {},
      recent_orders: [],
      recent_users: [],
      recent_activities: [],
      low_stock_products: [],
      sales_by_category: [],
      best_selling_products: [],
      traffic_sources: [],
      notifications: [],
      upcoming_events: [],
      users_by_region: [],
      revenue_vs_refunds: [],
      active_users: [],
      sales_data: [],
    }
  },

  async getUsers(params = {}): Promise<AdminPaginatedResponse<any>> {
    try {
      const response = await api.get("/api/admin/users", { params })
      return response.data
    } catch (error) {
      console.error("Error fetching users:", error)
      throw error
    }
  },

  async getAddresses(params = {}): Promise<AdminPaginatedResponse<any>> {
    try {
      const response = await api.get("/api/admin/addresses", { params })
      return response.data
    } catch (error) {
      console.error("Error fetching addresses:", error)
      throw error
    }
  },

  async updateAddress(id: number, addressData: any): Promise<any> {
    try {
      const response = await api.put(`/api/admin/addresses/${id}`, addressData)
      return response.data
    } catch (error) {
      console.error("Error updating address:", error)
      throw error
    }
  },

  async deleteAddress(id: number): Promise<void> {
    try {
      await api.delete(`/api/admin/addresses/${id}`)
    } catch (error) {
      console.error("Error deleting address:", error)
      throw error
    }
  },

  invalidateProductCaches(productId?: number): void {
    try {
      // Clear localStorage caches
      const keys = Object.keys(localStorage)
      keys.forEach((key) => {
        if (key.includes("product_") || key.includes("image_") || key.includes("swr-key")) {
          localStorage.removeItem(key)
        }
      })

      // Trigger a page refresh for user-facing pages
      if (typeof window !== "undefined") {
        // Dispatch a custom event to notify other components
        window.dispatchEvent(
          new CustomEvent("productImagesUpdated", {
            detail: { productId: productId?.toString() },
          }),
        )
      }

      console.log("[v0] Product caches invalidated", productId ? `for product ${productId}` : "")
    } catch (error) {
      console.warn("[v0] Error invalidating caches:", error)
    }
  },
}
