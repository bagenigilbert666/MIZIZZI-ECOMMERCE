/**
 * Custom hook for managing side panels
 * Provides reactive state management for panel data
 */

import { useState, useEffect, useCallback } from "react"
import { panelService, type SidePanelItem, type PanelStats } from "@/lib/services/panel-service"

export interface UseSidePanelsOptions {
  panelType?: string
  position?: string
  autoFetch?: boolean
}

export function useSidePanels(options: UseSidePanelsOptions = {}) {
  const {
    panelType = "product_showcase",
    position = "left",
    autoFetch = true,
  } = options

  const [items, setItems] = useState<SidePanelItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<PanelStats | null>(null)

  // Fetch items
  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await panelService.getAllPanelItems(panelType, position)
      setItems(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch items"
      setError(message)
      console.error("[v0] Error in useSidePanels:", err)
    } finally {
      setIsLoading(false)
    }
  }, [panelType, position])

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const data = await panelService.getPanelStats()
      setStats(data)
    } catch (err) {
      console.error("[v0] Error fetching stats:", err)
    }
  }, [])

  // Auto fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchItems()
      fetchStats()
    }
  }, [autoFetch, fetchItems, fetchStats])

  // Create item
  const createItem = useCallback(
    async (itemData: Partial<SidePanelItem>) => {
      try {
        setError(null)
        const newItem = await panelService.createPanelItem(itemData)
        if (newItem) {
          setItems((prev) => [...prev, newItem])
          await fetchStats()
          return newItem
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create item"
        setError(message)
        throw err
      }
    },
    [fetchStats]
  )

  // Update item
  const updateItem = useCallback(
    async (itemId: number, itemData: Partial<SidePanelItem>) => {
      try {
        setError(null)
        const updated = await panelService.updatePanelItem(itemId, itemData)
        if (updated) {
          setItems((prev) =>
            prev.map((item) => (item.id === itemId ? updated : item))
          )
          await fetchStats()
          return updated
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update item"
        setError(message)
        throw err
      }
    },
    [fetchStats]
  )

  // Delete item
  const deleteItem = useCallback(
    async (itemId: number) => {
      try {
        setError(null)
        const success = await panelService.deletePanelItem(itemId)
        if (success) {
          setItems((prev) => prev.filter((item) => item.id !== itemId))
          await fetchStats()
          return true
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete item"
        setError(message)
        throw err
      }
    },
    [fetchStats]
  )

  return {
    items,
    isLoading,
    error,
    stats,
    fetchItems,
    fetchStats,
    createItem,
    updateItem,
    deleteItem,
  }
}
