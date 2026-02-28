import api from "@/lib/api"
import type { AdminPaginatedResponse, ProductCreatePayload } from "@/types/admin"
import type { Product, Category } from "@/types"

// ============================================================================
// CACHE & SERVICE CONFIGURATION
// ============================================================================

const productCache = new Map()
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour

// ============================================================================
// TYPE DEFINITIONS - Dashboard & Analytics
// ============================================================================

interface AdminLoginResponse {
  user: any
  access_token: string
  refresh_token?: string
  csrf_token?: string
}

interface AdminDashboardResponse {
  // Core Counts
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
    total_active_sessions?: number
    total_sales_channels?: number
    total_vendors?: number
    refunds_pending?: number
  }

  // Sales Metrics
  sales: {
    today: number
    yesterday: number
    weekly: number
    monthly: number
    yearly: number
    total_revenue: number
    pending_amount: number
    average_order_value?: number
    net_profit?: number
    gross_profit?: number
    refunded_amount?: number
  }

  // Order Analytics
  order_status: Record<string, number>
  order_metrics?: {
    average_processing_time: number
    average_delivery_time: number
    repeat_order_rate: number
    cart_abandonment_rate: number
  }

  // Customer Analytics
  customer_analytics?: {
    total_customers: number
    new_customers_today: number
    repeat_customers: number
    customer_retention_rate: number
    average_customer_lifetime_value: number
    customer_satisfaction_score: number
  }

  // Traffic & Conversion
  traffic_analytics?: {
    total_visits: number
    unique_visitors: number
    page_views: number
    bounce_rate: number
    conversion_rate: number
    average_session_duration: number
  }

  // Regional & Demographic
  users_by_region?: Array<{ region: string; count: number }>
  users_by_device?: Array<{ device: string; count: number }>
  age_distribution?: Array<{ age_group: string; count: number }>

  // Time Series Data
  revenue_vs_refunds?: Array<{ date: string; revenue: number; refunds: number }>
  sales_data?: Array<{ date: string; sales: number; orders: number }>
  active_users?: Array<{ date: string; users: number }>

  // Recent Data (Paginated)
  recent_orders: Array<{
    id: string
    order_number: string
    user_email?: string
    total_amount: number
    status: string
    created_at?: string
  }>

  recent_users: Array<{
    id: number | string
    name: string
    email: string
    created_at?: string
  }>

  recent_activities: Array<{
    id: string | number
    message: string
    description?: string
    type: string
    timestamp?: string
    time?: string
  }>

  low_stock_products: Array<{
    id: number | string
    name: string
    sku: string
    stock: number
    min_stock?: number
  }>

  // Top Products & Categories
  best_selling_products: Array<{
    id: number | string
    name: string
    sales_count: number
    revenue: number
  }>

  sales_by_category: Array<{
    category: string
    sales: number
    revenue: number
    items_sold?: number
  }>

  top_customers?: Array<{
    id: number | string
    name: string
    email: string
    orders: number
    total_spent: number
  }>

  // System Information
  traffic_sources?: Array<{ source: string; count: number }>
  notifications?: Array<{
    id: string | number
    title: string
    message: string
    type: "warning" | "error" | "info" | "success"
    time?: string
  }>
  upcoming_events?: Array<{
    id: string
    title: string
    date: string
    type: string
  }>

  // System Health
  system_health?: {
    api_status: "healthy" | "warning" | "critical"
    database_status: "healthy" | "warning" | "critical"
    storage_status: "healthy" | "warning" | "critical"
    uptime: number
  }

  // SEO & Performance
  seo_metrics?: {
    indexed_pages: number
    search_impressions: number
    search_clicks: number
    average_ctr: number
  }

  performance_metrics?: {
    page_load_time: number
    api_response_time: number
    error_rate: number
  }
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

// ============================================================================
// ADMIN SERVICE - Complete API Integration
// ============================================================================

export const adminService = {
  // ========================================================================
  // AVAILABILITY CHECK
  // ========================================================================

  isServiceAvailable(): boolean {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL
      if (!apiUrl) {
        console.warn("[v0] Admin service: No API URL configured")
        return false
      }

      if (typeof window === "undefined") {
        return true
      }

      try {
        localStorage.getItem("test")
        return true
      } catch (e) {
        console.warn("[v0] Admin service: localStorage not available")
        return false
      }
    } catch (error) {
      console.error("[v0] Admin service availability check failed:", error)
      return false
    }
  },

  // ========================================================================
  // AUTHENTICATION METHODS
  // ========================================================================

  async login(credentials: { email: string; password: string; remember?: boolean }): Promise<AdminLoginResponse> {
    try {
      console.log("[v0] Admin login attempt for:", credentials.email)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: credentials.email,
          password: credentials.password,
        }),
        credentials: "include",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Login failed with status: ${response.status}`)
      }

      const data = await response.json()

      if (!data.user || data.user.role !== "admin") {
        throw new Error("You don't have permission to access the admin area")
      }

      // Store tokens
      if (data.access_token) {
        localStorage.setItem("mizizzi_token", data.access_token)
        localStorage.setItem("admin_token", data.access_token)
      }
      if (data.refresh_token) {
        localStorage.setItem("mizizzi_refresh_token", data.refresh_token)
        localStorage.setItem("admin_refresh_token", data.refresh_token)
      }
      if (data.csrf_token) {
        localStorage.setItem("mizizzi_csrf_token", data.csrf_token)
      }

      localStorage.setItem("user", JSON.stringify(data.user))
      localStorage.setItem("admin_user", JSON.stringify(data.user))

      console.log("[v0] Admin login successful for:", data.user.email)
      return data
    } catch (error) {
      console.error("[v0] Admin login error:", error)
      throw error
    }
  },

  async logout(): Promise<void> {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("mizizzi_token") || ""}`,
        },
        credentials: "include",
      })
    } catch (error) {
      console.warn("[v0] Logout API call failed, continuing with local logout")
    }

    localStorage.removeItem("mizizzi_token")
    localStorage.removeItem("mizizzi_refresh_token")
    localStorage.removeItem("mizizzi_csrf_token")
    localStorage.removeItem("admin_token")
    localStorage.removeItem("admin_refresh_token")
    localStorage.removeItem("admin_user")
    localStorage.removeItem("user")
  },

  async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem("mizizzi_refresh_token") || localStorage.getItem("admin_refresh_token")
      if (!refreshToken) {
        return false
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${refreshToken}`,
        },
        credentials: "include",
      })

      if (!response.ok) {
        return false
      }

      const data = await response.json()

      if (data.access_token) {
        localStorage.setItem("mizizzi_token", data.access_token)
        localStorage.setItem("admin_token", data.access_token)
      }

      if (data.refresh_token) {
        localStorage.setItem("mizizzi_refresh_token", data.refresh_token)
        localStorage.setItem("admin_refresh_token", data.refresh_token)
      }

      return true
    } catch (error) {
      console.error("[v0] Token refresh error:", error)
      return false
    }
  },

  // ========================================================================
  // DASHBOARD ANALYTICS
  // ========================================================================

  async getDashboardData(params?: { from_date?: string; to_date?: string }): Promise<AdminDashboardResponse> {
    try {
      console.log("[v0] Fetching dashboard data")
      const token = localStorage.getItem("mizizzi_token") || localStorage.getItem("admin_token")

      if (!token) {
        console.warn("[v0] No authentication token found")
        return this.getDefaultDashboardData()
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/dashboard${params ? `?from_date=${params.from_date}&to_date=${params.to_date}` : ""}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Dashboard data fetched successfully")
        return data
      }

      if (response.status === 401) {
        const refreshed = await this.refreshToken()
        if (refreshed) {
          return this.getDashboardData(params)
        }
        throw new Error("Authentication failed")
      }

      throw new Error(`Dashboard API returned status ${response.status}`)
    } catch (error) {
      console.error("[v0] Error fetching dashboard data:", error)
      return this.getDefaultDashboardData()
    }
  },

  async getProductStats(): Promise<any> {
    try {
      const response = await api.get("/api/admin/stats/products")
      return response.data
    } catch (error) {
      console.error("[v0] Error fetching product stats:", error)
      throw error
    }
  },

  async getSalesStats(params: { period?: string; from?: string; to?: string }): Promise<any> {
    try {
      const response = await api.get("/api/admin/stats/sales", { params })
      return response.data
    } catch (error) {
      console.error("[v0] Error fetching sales stats:", error)
      throw error
    }
  },

  async getAnalytics(params?: Record<string, any>): Promise<any> {
    try {
      const response = await api.get("/api/admin/analytics", { params })
      return response.data
    } catch (error) {
      console.error("[v0] Error fetching analytics:", error)
      throw error
    }
  },

  async getSystemHealth(): Promise<any> {
    try {
      const response = await api.get("/api/admin/system-health")
      return response.data
    } catch (error) {
      console.error("[v0] Error fetching system health:", error)
      throw error
    }
  },

  // ========================================================================
  // PRODUCT MANAGEMENT
  // ========================================================================

  async getProducts(params?: {
    page?: number
    per_page?: number
    search?: string
    category?: string
    status?: string
    sort?: string
  }): Promise<AdminPaginatedResponse<Product>> {
    try {
      const response = await api.get("/api/admin/products", { params })
      return response.data
    } catch (error) {
      console.error("[v0] Error fetching products:", error)
      throw error
    }
  },

  async getProduct(id: string): Promise<Product | null> {
    try {
      const cacheKey = `product_${id}`
      const cachedItem = productCache.get(cacheKey)

      if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_DURATION) {
        console.log("[v0] Returning cached product:", id)
        return cachedItem.data
      }

      const response = await api.get(`/api/products/${id}`)
      const product = response.data

      productCache.set(cacheKey, {
        data: product,
        timestamp: Date.now(),
      })

      return product
    } catch (error) {
      console.error("[v0] Error fetching product:", error)
      return null
    }
  },

  async createProduct(data: ProductCreatePayload): Promise<Product> {
    try {
      const response = await api.post("/api/admin/products", data)
      this.invalidateProductCaches()
      return response.data
    } catch (error) {
      console.error("[v0] Error creating product:", error)
      throw error
    }
  },

  async updateProduct(id: string, data: any): Promise<Product> {
    try {
      const response = await api.put(`/api/admin/products/${id}`, data)
      productCache.delete(`product_${id}`)
      this.invalidateProductCaches()
      return response.data
    } catch (error) {
      console.error("[v0] Error updating product:", error)
      throw error
    }
  },

  async deleteProduct(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.delete(`/api/admin/products/${id}`)
      productCache.delete(`product_${id}`)
      this.invalidateProductCaches()
      return response.data
    } catch (error) {
      console.error("[v0] Error deleting product:", error)
      throw error
    }
  },

  async getProductImages(productId: number): Promise<ProductImage[]> {
    try {
      const response = await api.get(`/api/admin/products/${productId}/images`)
      return response.data || []
    } catch (error) {
      console.error("[v0] Error fetching product images:", error)
      return []
    }
  },

  async uploadProductImage(productId: string, file: File): Promise<any> {
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("product_id", productId)

      const response = await api.post("/api/admin/products/upload-image", formData)
      this.invalidateProductCaches(Number(productId))
      return response.data
    } catch (error) {
      console.error("[v0] Error uploading product image:", error)
      throw error
    }
  },

  async deleteProductImage(imageIdOrUrl: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.delete("/api/admin/products/delete-image", {
        data: { image_id_or_url: imageIdOrUrl },
      })
      this.invalidateProductCaches()
      return response.data
    } catch (error) {
      console.error("[v0] Error deleting product image:", error)
      throw error
    }
  },

  // ========================================================================
  // ORDER MANAGEMENT
  // ========================================================================

  async getOrders(params?: {
    page?: number
    per_page?: number
    status?: string
    search?: string
    date_from?: string
    date_to?: string
  }): Promise<AdminPaginatedResponse<any>> {
    try {
      const response = await api.get("/api/admin/orders", { params })
      return response.data
    } catch (error) {
      console.error("[v0] Error fetching orders:", error)
      throw error
    }
  },

  async getOrder(orderId: number): Promise<any> {
    try {
      const response = await api.get(`/api/admin/orders/${orderId}`)
      return response.data
    } catch (error) {
      console.error("[v0] Error fetching order:", error)
      throw error
    }
  },

  async updateOrderStatus(orderId: number, status: string, notes?: string): Promise<any> {
    try {
      const response = await api.put(`/api/admin/orders/${orderId}/status`, {
        status,
        notes,
      })
      return response.data
    } catch (error) {
      console.error("[v0] Error updating order status:", error)
      throw error
    }
  },

  async cancelOrder(orderId: number, reason?: string): Promise<any> {
    try {
      const response = await api.post(`/api/admin/orders/${orderId}/cancel`, { reason })
      return response.data
    } catch (error) {
      console.error("[v0] Error canceling order:", error)
      throw error
    }
  },

  // ========================================================================
  // CUSTOMER MANAGEMENT
  // ========================================================================

  async getUsers(params = {}): Promise<AdminPaginatedResponse<any>> {
    try {
      const response = await api.get("/api/admin/users", { params })
      return response.data
    } catch (error) {
      console.error("[v0] Error fetching users:", error)
      throw error
    }
  },

  async updateUser(id: string, data: any): Promise<any> {
    try {
      const response = await api.put(`/api/admin/users/${id}`, data)
      return response.data
    } catch (error) {
      console.error("[v0] Error updating user:", error)
      throw error
    }
  },

  async activateUser(id: string): Promise<any> {
    try {
      const response = await api.post(`/api/admin/users/${id}/activate`, {})
      return response.data
    } catch (error) {
      console.error("[v0] Error activating user:", error)
      throw error
    }
  },

  async deactivateUser(id: string): Promise<any> {
    try {
      const response = await api.post(`/api/admin/users/${id}/deactivate`, {})
      return response.data
    } catch (error) {
      console.error("[v0] Error deactivating user:", error)
      throw error
    }
  },

  async deleteUser(id: string): Promise<any> {
    try {
      const response = await api.delete(`/api/admin/users/${id}`)
      return response.data
    } catch (error) {
      console.error("[v0] Error deleting user:", error)
      throw error
    }
  },

  // ========================================================================
  // CATEGORY MANAGEMENT
  // ========================================================================

  async getCategories(params: Record<string, any> = {}): Promise<AdminPaginatedResponse<Category>> {
    try {
      const response = await api.get("/api/admin/categories", { params })
      return response.data
    } catch (error) {
      console.error("[v0] Error fetching categories:", error)
      throw error
    }
  },

  async createCategory(data: any): Promise<any> {
    try {
      const response = await api.post("/api/admin/categories", data)
      return response.data
    } catch (error) {
      console.error("[v0] Error creating category:", error)
      throw error
    }
  },

  async updateCategory(id: string, data: any): Promise<any> {
    try {
      const response = await api.put(`/api/admin/categories/${id}`, data)
      return response.data
    } catch (error) {
      console.error("[v0] Error updating category:", error)
      throw error
    }
  },

  async deleteCategory(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.delete(`/api/admin/categories/${id}`)
      return response.data
    } catch (error) {
      console.error("[v0] Error deleting category:", error)
      throw error
    }
  },

  // ========================================================================
  // BRAND MANAGEMENT
  // ========================================================================

  async getBrands(params?: { page?: number; per_page?: number; search?: string }): Promise<any> {
    try {
      const response = await api.get("/api/admin/brands", { params })
      return response.data
    } catch (error) {
      console.error("[v0] Error fetching brands:", error)
      throw error
    }
  },

  async createBrand(data: any): Promise<any> {
    try {
      const response = await api.post("/api/admin/brands", data)
      return response.data
    } catch (error) {
      console.error("[v0] Error creating brand:", error)
      throw error
    }
  },

  async updateBrand(id: string, data: any): Promise<any> {
    try {
      const response = await api.put(`/api/admin/brands/${id}`, data)
      return response.data
    } catch (error) {
      console.error("[v0] Error updating brand:", error)
      throw error
    }
  },

  async deleteBrand(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.delete(`/api/admin/brands/${id}`)
      return response.data
    } catch (error) {
      console.error("[v0] Error deleting brand:", error)
      throw error
    }
  },

  // ========================================================================
  // REVIEW & RATING MANAGEMENT
  // ========================================================================

  async getReviews(params = {}): Promise<AdminPaginatedResponse<any>> {
    try {
      const response = await api.get("/api/admin/reviews", { params })
      return response.data
    } catch (error) {
      console.error("[v0] Error fetching reviews:", error)
      throw error
    }
  },

  async updateReviewStatus(id: string, status: "approved" | "rejected" | "pending"): Promise<any> {
    try {
      const response = await api.put(`/api/admin/reviews/${id}/status`, { status })
      return response.data
    } catch (error) {
      console.error("[v0] Error updating review status:", error)
      throw error
    }
  },

  async deleteReview(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.delete(`/api/admin/reviews/${id}`)
      return response.data
    } catch (error) {
      console.error("[v0] Error deleting review:", error)
      throw error
    }
  },

  // ========================================================================
  // NEWSLETTER & COMMUNICATIONS
  // ========================================================================

  async getNewsletterSubscribers(params = {}): Promise<AdminPaginatedResponse<any>> {
    try {
      const response = await api.get("/api/admin/newsletters", { params })
      return response.data
    } catch (error) {
      console.error("[v0] Error fetching newsletter subscribers:", error)
      throw error
    }
  },

  async sendNewsletter(data: { subject: string; content: string; recipientGroups?: string[] }): Promise<any> {
    try {
      const response = await api.post("/api/admin/newsletters/send", data)
      return response.data
    } catch (error) {
      console.error("[v0] Error sending newsletter:", error)
      throw error
    }
  },

  // ========================================================================
  // NOTIFICATIONS & ALERTS
  // ========================================================================

  async getNotifications(params = {}): Promise<AdminPaginatedResponse<any>> {
    try {
      const response = await api.get("/api/admin/notifications", { params })
      return response.data
    } catch (error) {
      console.error("[v0] Error fetching notifications:", error)
      throw error
    }
  },

  async markNotificationRead(id: string): Promise<any> {
    try {
      const response = await api.put(`/api/admin/notifications/${id}/read`, {})
      return response.data
    } catch (error) {
      console.error("[v0] Error marking notification as read:", error)
      throw error
    }
  },

  // ========================================================================
  // SETTINGS & CONFIGURATION
  // ========================================================================

  async getSettings(): Promise<any> {
    try {
      const response = await api.get("/api/admin/settings")
      return response.data
    } catch (error) {
      console.error("[v0] Error fetching settings:", error)
      throw error
    }
  },

  async updateSettings(data: any): Promise<any> {
    try {
      const response = await api.put("/api/admin/settings", data)
      return response.data
    } catch (error) {
      console.error("[v0] Error updating settings:", error)
      throw error
    }
  },

  async getProfile(): Promise<any> {
    try {
      const response = await api.get("/api/admin/profile")
      return response.data
    } catch (error) {
      console.error("[v0] Error fetching profile:", error)
      throw error
    }
  },

  async updateProfile(data: any): Promise<any> {
    try {
      const response = await api.put("/api/admin/profile", data)
      return response.data
    } catch (error) {
      console.error("[v0] Error updating profile:", error)
      throw error
    }
  },

  // ========================================================================
  // ADDRESS MANAGEMENT
  // ========================================================================

  async getAddresses(params = {}): Promise<AdminPaginatedResponse<any>> {
    try {
      const response = await api.get("/api/admin/addresses", { params })
      return response.data
    } catch (error) {
      console.error("[v0] Error fetching addresses:", error)
      throw error
    }
  },

  async updateAddress(id: number, addressData: any): Promise<any> {
    try {
      const response = await api.put(`/api/admin/addresses/${id}`, addressData)
      return response.data
    } catch (error) {
      console.error("[v0] Error updating address:", error)
      throw error
    }
  },

  async deleteAddress(id: number): Promise<void> {
    try {
      await api.delete(`/api/admin/addresses/${id}`)
    } catch (error) {
      console.error("[v0] Error deleting address:", error)
      throw error
    }
  },

  // ========================================================================
  // INVENTORY MANAGEMENT
  // ========================================================================

  async getInventory(params?: Record<string, any>): Promise<any> {
    try {
      const response = await api.get("/api/admin/inventory", { params })
      return response.data
    } catch (error) {
      console.error("[v0] Error fetching inventory:", error)
      throw error
    }
  },

  async updateInventory(productId: string, quantity: number): Promise<any> {
    try {
      const response = await api.put(`/api/admin/inventory/${productId}`, { quantity })
      return response.data
    } catch (error) {
      console.error("[v0] Error updating inventory:", error)
      throw error
    }
  },

  async getLowStockProducts(params?: Record<string, any>): Promise<any> {
    try {
      const response = await api.get("/api/admin/inventory/low-stock", { params })
      return response.data
    } catch (error) {
      console.error("[v0] Error fetching low stock products:", error)
      throw error
    }
  },

  // ========================================================================
  // REPORTS & EXPORTS
  // ========================================================================

  async generateReport(type: string, params?: Record<string, any>): Promise<any> {
    try {
      const response = await api.get(`/api/admin/reports/${type}`, { params })
      return response.data
    } catch (error) {
      console.error("[v0] Error generating report:", error)
      throw error
    }
  },

  async exportData(type: string, format: "csv" | "excel" | "pdf" = "csv", params?: Record<string, any>): Promise<Blob> {
    try {
      const response = await api.get(`/api/admin/export/${type}?format=${format}`, {
        params,
        responseType: "blob",
      })
      return response.data
    } catch (error) {
      console.error("[v0] Error exporting data:", error)
      throw error
    }
  },

  // ========================================================================
  // CACHE MANAGEMENT
  // ========================================================================

  invalidateProductCaches(productId?: number): void {
    try {
      const keys = Object.keys(localStorage)
      keys.forEach((key) => {
        if (key.includes("product_") || key.includes("image_")) {
          localStorage.removeItem(key)
        }
      })

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("productImagesUpdated", {
            detail: { productId: productId?.toString() },
          })
        )
      }

      console.log("[v0] Product caches invalidated", productId ? `for product ${productId}` : "")
    } catch (error) {
      console.warn("[v0] Error invalidating caches:", error)
    }
  },

  // ========================================================================
  // DEFAULT DATA
  // ========================================================================

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
        total_active_sessions: 0,
        total_sales_channels: 0,
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
}
