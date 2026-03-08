"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Zap, Trash2, RotateCcw, AlertTriangle } from "lucide-react"

interface QuickActionsProps {
  onClearCritical?: () => void
  onClearDeferred?: () => void
  onClearHomepage?: () => void
  onRebuild?: () => void
  onClearAll?: () => void
  isLoading?: boolean
  disabled?: boolean
}

export function QuickActions({
  onClearCritical,
  onClearDeferred,
  onClearHomepage,
  onRebuild,
  onClearAll,
  isLoading,
  disabled,
}: QuickActionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-600" />
          Quick Actions
        </CardTitle>
        <CardDescription>Common cache operations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <Button
            variant="outline"
            onClick={onClearCritical}
            disabled={disabled || isLoading}
            className="gap-2 h-auto flex-col py-3"
          >
            <Trash2 className="h-4 w-4" />
            <span className="text-xs font-medium">Clear Critical</span>
          </Button>

          <Button
            variant="outline"
            onClick={onClearDeferred}
            disabled={disabled || isLoading}
            className="gap-2 h-auto flex-col py-3"
          >
            <Trash2 className="h-4 w-4" />
            <span className="text-xs font-medium">Clear Deferred</span>
          </Button>

          <Button
            variant="outline"
            onClick={onClearHomepage}
            disabled={disabled || isLoading}
            className="gap-2 h-auto flex-col py-3"
          >
            <Trash2 className="h-4 w-4" />
            <span className="text-xs font-medium">Clear Homepage</span>
          </Button>

          <Button
            variant="outline"
            onClick={onRebuild}
            disabled={disabled || isLoading}
            className="gap-2 h-auto flex-col py-3"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="text-xs font-medium">Rebuild</span>
          </Button>

          <Button
            variant="destructive"
            onClick={onClearAll}
            disabled={disabled || isLoading}
            className="gap-2 h-auto flex-col py-3"
          >
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-medium">Clear All</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
