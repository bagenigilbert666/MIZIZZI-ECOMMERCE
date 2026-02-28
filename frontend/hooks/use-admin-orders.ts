import { useCallback, useState, useEffect } from "react"
import type { OrdersResponse } from "@/lib/server/get-orders-with-auth"
import { adminService } from "@/services/admin"
import { useAdminAuth } from "@/contexts/admin/auth-context"

export interface UseAdminOrdersOptions {
  page?: number
  per_page?: number
  status?: string
  search?: string
}

export function useAdminOrders(options?: UseAdminOrdersOptions) {
  const { isAuthenticated, getToken } = useAdminAuth()
  const [data, setData] = useState<OrdersResponse>({
    items: [],
    pagination: {
      total_pages: 1,
      total_items: 0,
      current_page: 1,
    },
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchOrders = useCallback(
    async (overrideOptions?: UseAdminOrdersOptions) => {
      try {
        setIsLoading(true)
        setError(null)

        const mergedOptions = {
          page: options?.page || 1,
          per_page: options?.per_page || 20,
          ...overrideOptions,
        }

        // Get token from context
        const authToken = getToken()

        if (!authToken) {
          throw new Error("Authentication required. Please log in.")
        }

        // Fetch orders using admin service
        const response = await adminService.getOrders(mergedOptions)

        setData(response)
        return response
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to fetch orders")
        setError(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [options, getToken],
  )

  // Auto-fetch on mount or when dependencies change
  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders().catch((err) => {
        console.error("[v0] Failed to fetch orders on mount:", err)
      })
    }
  }, [isAuthenticated, fetchOrders])

  const refetch = useCallback(() => {
    return fetchOrders()
  }, [fetchOrders])

  return {
    data,
    isLoading,
    error,
    refetch,
    orders: data.items,
    pagination: data.pagination,
  }
}

