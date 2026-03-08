/**
 * Cache Invalidation Mapping Utility
 * Centralized utility for determining which caches to clear for specific admin actions
 */

import type { CacheGroupType } from "@/types/cache-management"
import { CACHE_INVALIDATION_MAP, CacheGroupType as CGT } from "@/types/cache-management"

export interface CacheInvalidationAction {
  resource: string
  operation: "create" | "update" | "delete"
}

export interface CacheInvalidationConfig {
  action: CacheInvalidationAction
  affectedGroups?: CacheGroupType[]
}

/**
 * Get cache groups to invalidate for a specific admin action
 * @param resource - Resource type (e.g., 'products', 'categories', 'carousel')
 * @param operation - Operation type ('create', 'update', or 'delete')
 * @returns Array of cache group types that should be invalidated
 */
export function getCacheGroupsForAction(
  resource: string,
  operation: "create" | "update" | "delete"
): CacheGroupType[] {
  const key = `${resource}:${operation}`
  return CACHE_INVALIDATION_MAP[key] || []
}

/**
 * Create a cache invalidation config for an admin action
 * @param resource - Resource type
 * @param operation - Operation type
 * @returns Cache invalidation configuration object
 */
export function createCacheInvalidationConfig(
  resource: string,
  operation: "create" | "update" | "delete"
): CacheInvalidationConfig {
  return {
    action: { resource, operation },
    affectedGroups: getCacheGroupsForAction(resource, operation),
  }
}

/**
 * Check if a resource action requires cache invalidation
 * @param resource - Resource type
 * @param operation - Operation type
 * @returns true if cache invalidation is needed
 */
export function shouldInvalidateCache(resource: string, operation: "create" | "update" | "delete"): boolean {
  const groups = getCacheGroupsForAction(resource, operation)
  return groups.length > 0
}

/**
 * Get a human-readable description of cache invalidation
 * @param resource - Resource type
 * @param operation - Operation type
 * @returns Description string
 */
export function getInvalidationDescription(resource: string, operation: "create" | "update" | "delete"): string {
  const groups = getCacheGroupsForAction(resource, operation)
  if (groups.length === 0) return "No cache invalidation"

  const groupNames = groups
    .map((g) => {
      switch (g) {
        case CGT.CRITICAL:
          return "Critical"
        case CGT.DEFERRED:
          return "Deferred"
        case CGT.HOMEPAGE:
          return "Homepage"
        case CGT.ALL:
          return "All"
        default:
          return g
      }
    })
    .join(", ")

  return `Invalidating ${groupNames} caches`
}

/**
 * Get all resources that affect a specific cache group
 * @param targetGroup - Cache group to search for
 * @returns Array of [resource, operation] tuples
 */
export function getResourcesAffectingGroup(targetGroup: CacheGroupType): Array<[string, string]> {
  const results: Array<[string, string]> = []

  Object.entries(CACHE_INVALIDATION_MAP).forEach(([key, groups]) => {
    if (groups.includes(targetGroup)) {
      const [resource, operation] = key.split(":")
      results.push([resource, operation])
    }
  })

  return results
}

/**
 * Merge multiple cache groups and remove duplicates
 * @param groupArrays - Arrays of cache groups to merge
 * @returns Unique cache groups
 */
export function mergeCacheGroups(...groupArrays: CacheGroupType[][]): CacheGroupType[] {
  const unique = new Set(groupArrays.flat())
  return Array.from(unique)
}

/**
 * Check if invalidation includes all cache groups
 * @param groups - Cache groups to check
 * @returns true if all caches will be cleared
 */
export function isFullInvalidation(groups: CacheGroupType[]): boolean {
  return groups.includes(CGT.ALL) || groups.length === Object.values(CGT).length - 1 // -1 to exclude "ALL" enum value
}

/**
 * Get a summary of cache invalidation for multiple actions
 * @param actions - Array of cache invalidation actions
 * @returns Summary object with unique groups and action count
 */
export function getSummary(
  actions: Array<{ resource: string; operation: "create" | "update" | "delete" }>
): {
  totalActions: number
  uniqueGroups: CacheGroupType[]
  isFullInvalidation: boolean
  description: string
} {
  const groups = mergeCacheGroups(
    ...actions.map(({ resource, operation }) => getCacheGroupsForAction(resource, operation))
  )

  const isFullClear = isFullInvalidation(groups)

  return {
    totalActions: actions.length,
    uniqueGroups: groups,
    isFullInvalidation: isFullClear,
    description: isFullClear
      ? "Full cache invalidation required"
      : `Invalidating ${groups.length} cache group(s)`,
  }
}

/**
 * Register a custom cache invalidation mapping
 * This allows adding runtime mappings for dynamic resources
 * @param resource - Resource type
 * @param operation - Operation type
 * @param groups - Cache groups to invalidate
 */
export function registerCacheInvalidation(
  resource: string,
  operation: "create" | "update" | "delete",
  groups: CacheGroupType[]
): void {
  const key = `${resource}:${operation}`
  CACHE_INVALIDATION_MAP[key] = groups
}
