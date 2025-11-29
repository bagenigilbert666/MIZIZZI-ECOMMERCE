/**
 * Side Panel Management Service
 * Handles all API calls related to side panel management
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://mizizzi-ecommerce-1.onrender.com"

export interface SidePanelItem {
  id: number
  panel_type: string
  position: string
  title: string
  metric: string
  description: string
  icon_name: string
  image_url: string
  gradient: string
  features: string[]
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface PanelStats {
  total_items: number
  active_items: number
  inactive_items: number
  by_type: {
    product_showcase: number
    premium_experience: number
  }
}

class PanelService {
  private getAuthToken(): string | null {
    if (typeof window === "undefined") return null
    return localStorage.getItem("admin_token") || localStorage.getItem("token")
  }

  private getHeaders(withAuth = true): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    }

    if (withAuth) {
      const token = this.getAuthToken()
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }
    }

    return headers
  }

  /**
   * Get side panel items for display (public endpoint)
   */
  async getPanelItems(
    panelType: string,
    position: string = "left"
  ): Promise<SidePanelItem[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/panels/items?panel_type=${panelType}&position=${position}`,
        {
          headers: this.getHeaders(false),
        }
      )

      if (!response.ok) {
        console.error(`[v0] Failed to fetch panel items: ${response.statusText}`)
        return []
      }

      const data = await response.json()
      return data.items || []
    } catch (error) {
      console.error("[v0] Error fetching panel items:", error)
      return []
    }
  }

  /**
   * Get a single panel item by ID
   */
  async getPanelItem(itemId: number): Promise<SidePanelItem | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/panels/item/${itemId}`, {
        headers: this.getHeaders(false),
      })

      if (!response.ok) {
        console.error(`[v0] Failed to fetch panel item: ${response.statusText}`)
        return null
      }

      const data = await response.json()
      return data.item || null
    } catch (error) {
      console.error("[v0] Error fetching panel item:", error)
      return null
    }
  }

  /**
   * Get all panel items (admin endpoint)
   */
  async getAllPanelItems(
    panelType?: string,
    position?: string
  ): Promise<SidePanelItem[]> {
    try {
      let url = `${API_BASE_URL}/api/panels/admin/all`
      const params = new URLSearchParams()

      if (panelType) params.append("panel_type", panelType)
      if (position) params.append("position", position)

      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await fetch(url, {
        headers: this.getHeaders(true),
      })

      if (!response.ok) {
        console.error(`[v0] Failed to fetch all panel items: ${response.statusText}`)
        return []
      }

      const data = await response.json()
      return data.items || []
    } catch (error) {
      console.error("[v0] Error fetching all panel items:", error)
      return []
    }
  }

  /**
   * Create a new side panel item
   */
  async createPanelItem(
    itemData: Partial<SidePanelItem>
  ): Promise<SidePanelItem | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/panels/admin`, {
        method: "POST",
        headers: this.getHeaders(true),
        body: JSON.stringify(itemData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create panel item")
      }

      const data = await response.json()
      return data.item || null
    } catch (error) {
      console.error("[v0] Error creating panel item:", error)
      throw error
    }
  }

  /**
   * Update an existing side panel item
   */
  async updatePanelItem(
    itemId: number,
    itemData: Partial<SidePanelItem>
  ): Promise<SidePanelItem | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/panels/admin/${itemId}`, {
        method: "PUT",
        headers: this.getHeaders(true),
        body: JSON.stringify(itemData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update panel item")
      }

      const data = await response.json()
      return data.item || null
    } catch (error) {
      console.error("[v0] Error updating panel item:", error)
      throw error
    }
  }

  /**
   * Delete a side panel item
   */
  async deletePanelItem(itemId: number): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/panels/admin/${itemId}`, {
        method: "DELETE",
        headers: this.getHeaders(true),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete panel item")
      }

      return true
    } catch (error) {
      console.error("[v0] Error deleting panel item:", error)
      throw error
    }
  }

  /**
   * Get panel statistics
   */
  async getPanelStats(): Promise<PanelStats | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/panels/admin/stats`, {
        headers: this.getHeaders(true),
      })

      if (!response.ok) {
        console.error(`[v0] Failed to fetch panel stats: ${response.statusText}`)
        return null
      }

      const data = await response.json()
      return data.stats || null
    } catch (error) {
      console.error("[v0] Error fetching panel stats:", error)
      return null
    }
  }

  /**
   * Check if panel service is healthy
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/panels/health`)
      return response.ok
    } catch (error) {
      console.error("[v0] Panel service health check failed:", error)
      return false
    }
  }

  /**
   * Bulk update multiple panel items
   */
  async bulkUpdatePanelItems(
    itemIds: number[],
    updates: Partial<SidePanelItem>
  ): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/panels/admin/bulk-update`, {
        method: "POST",
        headers: this.getHeaders(true),
        body: JSON.stringify({
          item_ids: itemIds,
          updates,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to bulk update panel items")
      }

      return true
    } catch (error) {
      console.error("[v0] Error in bulk update:", error)
      throw error
    }
  }

  /**
   * Reorder panel items
   */
  async reorderPanelItems(
    items: Array<{ id: number; sort_order: number }>
  ): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/panels/admin/reorder`, {
        method: "POST",
        headers: this.getHeaders(true),
        body: JSON.stringify({ items }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to reorder panel items")
      }

      return true
    } catch (error) {
      console.error("[v0] Error reordering panel items:", error)
      throw error
    }
  }
}

// Export a singleton instance
export const panelService = new PanelService()
