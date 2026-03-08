"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

interface DangerZoneProps {
  onClearAll?: () => void
  onRebuild?: () => void
  isLoading?: boolean
  disabled?: boolean
}

export function DangerZone({ onClearAll, onRebuild, isLoading, disabled }: DangerZoneProps) {
  return (
    <Card className="border-red-200 dark:border-red-900/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-500">
          <AlertTriangle className="h-5 w-5" />
          Danger Zone
        </CardTitle>
        <CardDescription>Advanced cache operations - use with caution</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20 border border-red-200 dark:border-red-900">
          <p className="text-sm text-red-800 dark:text-red-300">
            These actions affect all caches and may impact site performance. Use only when necessary.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <div>
              <h4 className="font-medium text-slate-900 dark:text-white mb-1">Clear All Caches</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                Removes all cached data. Site will be slow until cache rebuilds.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={onClearAll}
              disabled={disabled || isLoading}
              className="w-full"
            >
              {isLoading ? "Processing..." : "Clear All Caches"}
            </Button>
          </div>

          <div className="space-y-2">
            <div>
              <h4 className="font-medium text-slate-900 dark:text-white mb-1">Rebuild Caches</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                Clears and repopulates caches with fresh data from database.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={onRebuild}
              disabled={disabled || isLoading}
              className="w-full"
            >
              {isLoading ? "Processing..." : "Rebuild Caches"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
