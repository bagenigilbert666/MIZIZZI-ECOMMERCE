/**
 * Auto-Invalidate Cache Helper
 * Automatically triggers cache invalidation after successful CRUD operations
 * This should be used in all admin components after successful API calls
 */

import { useToast } from "@/hooks/use-toast"
import cacheManagementService from "@/services/cache-management"
import { getCacheGroupsForAction } from "@/lib/utils/cache-invalidation-map"
import type { CacheGroupType } from "@/types/cache-management"

/**
 * Hook for automatic cache invalidation in admin components
 * Usage:
 *   const { invalidateAfterAction } = useAutoInvalidateCache()
 *   
 *   // In your create/update/delete handler:
 *   const response = await apiCall()
 *   if (response.ok) {
 *     await invalidateAfterAction("products", "create")
 *   }
 */
export function useAutoInvalidateCache() {
  const { toast } = useToast()

  /**
   * Trigger cache invalidation for an admin action
   * @param resource - Resource type (e.g., "products", "categories")
   * @param operation - Operation type ("create", "update", or "delete")
   * @param silent - If true, don't show toast notifications
   */
  async function invalidateAfterAction(
    resource: string,
    operation: "create" | "update" | "delete",
    silent: boolean = false
  ): Promise<boolean> {
    try {
      const groups = getCacheGroupsForAction(resource, operation)

      if (groups.length === 0) {
        if (!silent) {
          console.log(`[Auto-Invalidate] No cache invalidation needed for ${resource}:${operation}`)
        }
        return true
      }

      if (!silent) {
        console.log(`[Auto-Invalidate] Invalidating caches for ${resource}:${operation}`, groups)
      }

      // Invalidate the appropriate cache groups
      const result = await cacheManagementService.invalidateCachesByGroups(groups)

      if (result.success) {
        if (!silent) {
          toast({
            title: "Cache Updated",
            description: `Cleared ${groups.length} cache group(s) after ${operation}`,
          })
        }
        return true
      } else {
        if (!silent) {
          toast({
            title: "Cache Warning",
            description: result.message,
            variant: "destructive",
          })
        }
        return false
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      if (!silent) {
        console.error("[Auto-Invalidate] Error:", message)
        toast({
          title: "Cache Error",
          description: "Failed to invalidate cache, but your changes were saved.",
          variant: "destructive",
        })
      }
      // Return true because the operation succeeded even if cache invalidation failed
      return true
    }
  }

  return { invalidateAfterAction }
}

/**
 * Non-hook version for use outside of React components
 * Usage:
 *   await autoInvalidateCache("products", "update")
 */
export async function autoInvalidateCache(
  resource: string,
  operation: "create" | "update" | "delete",
  silent: boolean = false
): Promise<boolean> {
  try {
    const groups = getCacheGroupsForAction(resource, operation)

    if (groups.length === 0) {
      if (!silent) console.log(`[Auto-Invalidate] No cache needed for ${resource}:${operation}`)
      return true
    }

    const result = await cacheManagementService.invalidateCachesByGroups(groups)
    return result.success
  } catch (error) {
    if (!silent) console.error("[Auto-Invalidate] Error:", error)
    return true // Don't fail the main operation
  }
}

/**
 * Batch invalidation for multiple operations
 * Usage:
 *   await batchInvalidateCache([
 *     { resource: "products", operation: "create" },
 *     { resource: "categories", operation: "update" }
 *   ])
 */
export async function batchInvalidateCache(
  actions: Array<{ resource: string; operation: "create" | "update" | "delete" }>,
  silent: boolean = false
): Promise<boolean> {
  try {
    const allGroups = new Set<CacheGroupType>()

    actions.forEach(({ resource, operation }) => {
      const groups = getCacheGroupsForAction(resource, operation)
      groups.forEach((group) => allGroups.add(group))
    })

    if (allGroups.size === 0) {
      if (!silent) console.log("[Auto-Invalidate] No caches to invalidate")
      return true
    }

    const result = await cacheManagementService.invalidateCachesByGroups(Array.from(allGroups))
    return result.success
  } catch (error) {
    if (!silent) console.error("[Auto-Invalidate] Batch error:", error)
    return true
  }
}

/**
 * Example usage in a component:
 *
 * export function ProductCreateForm() {
 *   const { invalidateAfterAction } = useAutoInvalidateCache()
 *
 *   const handleSubmit = async (data) => {
 *     try {
 *       const response = await fetch('/api/products', {
 *         method: 'POST',
 *         body: JSON.stringify(data)
 *       })
 *
 *       if (response.ok) {
 *         // Only invalidate cache after successful DB commit
 *         await invalidateAfterAction('products', 'create')
 *         // Refresh data
 *         mutate('/api/products')
 *       }
 *     } catch (error) {
 *       toast({ title: 'Error', description: error.message })
 *     }
 *   }
 *
 *   return <form onSubmit={handleSubmit}>...</form>
 * }
 */
