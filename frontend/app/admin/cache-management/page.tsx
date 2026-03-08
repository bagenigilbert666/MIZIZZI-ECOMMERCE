"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { useCacheManagement } from "@/hooks/use-cache-management"
import { CacheStatusCard } from "@/components/admin/cache-management/cache-status-card"
import { CacheGroupsSection } from "@/components/admin/cache-management/cache-groups-section"
import { QuickActions } from "@/components/admin/cache-management/quick-actions"
import { InvalidationHistory } from "@/components/admin/cache-management/invalidation-history"
import { DangerZone } from "@/components/admin/cache-management/danger-zone"
import { CacheInvalidationDialog } from "@/components/admin/cache-management/cache-invalidation-dialog"
import { CACHE_GROUPS_CONFIG, CacheGroupType } from "@/types/cache-management"
import { AlertCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface DialogState {
  isOpen: boolean
  type: "critical" | "deferred" | "homepage" | "all" | "rebuild" | "pattern" | null
  selectedPattern?: string
}

export default function CacheManagementPage() {
  const { toast } = useToast()
  const {
    cacheStatus,
    history,
    isLoading,
    error,
    isServiceAvailable,
    fetchCacheStatus,
    fetchHistory,
    invalidateCache,
    invalidateCacheGroup,
    invalidateAllCaches,
    rebuildCaches,
  } = useCacheManagement({ autoRefresh: true, refreshInterval: 30000 })

  const [dialog, setDialog] = useState<DialogState>({ isOpen: false, type: null })
  const [isProcessing, setIsProcessing] = useState(false)

  // Fetch history on mount
  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const handleDialogOpen = (type: DialogState["type"], selectedPattern?: string) => {
    setDialog({ isOpen: true, type, selectedPattern })
  }

  const handleDialogConfirm = async () => {
    if (!dialog.type) return

    setIsProcessing(true)
    try {
      let result
      let toastMessage = ""

      switch (dialog.type) {
        case "critical":
          result = await invalidateCacheGroup(CacheGroupType.CRITICAL)
          toastMessage = "Critical caches cleared successfully"
          break
        case "deferred":
          result = await invalidateCacheGroup(CacheGroupType.DEFERRED)
          toastMessage = "Deferred caches cleared successfully"
          break
        case "homepage":
          result = await invalidateCacheGroup(CacheGroupType.HOMEPAGE)
          toastMessage = "Homepage caches cleared successfully"
          break
        case "all":
          result = await invalidateAllCaches(true)
          toastMessage = "All caches cleared successfully"
          break
        case "rebuild":
          const rebuildResult = await rebuildCaches(false)
          if (rebuildResult.success) {
            toastMessage = "Caches rebuilt successfully"
            toast({ title: "Success", description: toastMessage })
          } else {
            toast({ title: "Error", description: rebuildResult.message, variant: "destructive" })
          }
          setDialog({ isOpen: false, type: null })
          return
        case "pattern":
          if (dialog.selectedPattern) {
            result = await invalidateCache(dialog.selectedPattern)
            toastMessage = `Cache pattern cleared: ${dialog.selectedPattern}`
          }
          break
      }

      if (result && result.success) {
        toast({ title: "Success", description: toastMessage })
        fetchHistory()
      } else if (result) {
        toast({ title: "Warning", description: result.message, variant: "destructive" })
      }

      setDialog({ isOpen: false, type: null })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to process cache operation"
      toast({ title: "Error", description: message, variant: "destructive" })
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isServiceAvailable) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Cache Management</h1>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Cache management service is unavailable. Please ensure the Flask backend is running at {process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (error && !cacheStatus) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Cache Management</h1>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>

        <button
          onClick={fetchCacheStatus}
          className="inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Retry"}
        </button>
      </div>
    )
  }

  const cacheGroups = Object.values(CACHE_GROUPS_CONFIG)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Cache Management</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Monitor and manage application cache groups and invalidation
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Status Card */}
      <CacheStatusCard status={cacheStatus} isLoading={isLoading} />

      {/* Quick Actions */}
      <QuickActions
        onClearCritical={() => handleDialogOpen("critical")}
        onClearDeferred={() => handleDialogOpen("deferred")}
        onClearHomepage={() => handleDialogOpen("homepage")}
        onRebuild={() => handleDialogOpen("rebuild")}
        onClearAll={() => handleDialogOpen("all")}
        isLoading={isProcessing}
        disabled={isLoading}
      />

      {/* Cache Groups */}
      <CacheGroupsSection
        groups={cacheGroups}
        onInvalidate={(group) => handleDialogOpen(group as DialogState["type"])}
        onInvalidatePattern={(pattern) => handleDialogOpen("pattern", pattern)}
        isLoading={isProcessing}
        disabled={isLoading}
      />

      {/* Invalidation History */}
      {history && (
        <InvalidationHistory
          history={history.items}
          isLoading={isLoading}
          total={history.total}
        />
      )}

      {/* Danger Zone */}
      <DangerZone
        onClearAll={() => handleDialogOpen("all")}
        onRebuild={() => handleDialogOpen("rebuild")}
        isLoading={isProcessing}
        disabled={isLoading}
      />

      {/* Confirmation Dialog */}
      <CacheInvalidationDialog
        isOpen={dialog.isOpen}
        onOpenChange={(open) => !open && setDialog({ isOpen: false, type: null })}
        title={
          dialog.type === "all"
            ? "Clear All Caches"
            : dialog.type === "rebuild"
              ? "Rebuild Caches"
              : dialog.type === "pattern"
                ? "Clear Cache Pattern"
                : dialog.type === "critical"
                  ? "Clear Critical Caches"
                  : dialog.type === "deferred"
                    ? "Clear Deferred Caches"
                    : "Clear Homepage Caches"
        }
        description={
          dialog.type === "all"
            ? "This will clear ALL caches in the system. This may significantly impact performance until caches are rebuilt."
            : dialog.type === "rebuild"
              ? "This will clear and rebuild all homepage caches with fresh data from the database."
              : dialog.type === "pattern"
                ? `Clear cache with pattern: ${dialog.selectedPattern}`
                : `Clear ${dialog.type} cache group?`
        }
        affectedCaches={
          dialog.type && dialog.type !== "pattern"
            ? CACHE_GROUPS_CONFIG[dialog.type as CacheGroupType]?.patterns.map((p) => p.name) || []
            : []
        }
        isDangerous={dialog.type === "all"}
        requiresDoubleConfirm={dialog.type === "all"}
        onConfirm={handleDialogConfirm}
        isLoading={isProcessing}
      />
    </div>
  )
}
