"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { CacheGroupStatus, CacheGroupType } from "@/types/cache-management"
import { Trash2, RotateCcw } from "lucide-react"

interface CacheGroupsSectionProps {
  groups: CacheGroupStatus[]
  onInvalidate?: (groupType: CacheGroupType) => void
  onInvalidatePattern?: (pattern: string) => void
  isLoading?: boolean
  disabled?: boolean
}

export function CacheGroupsSection({
  groups,
  onInvalidate,
  onInvalidatePattern,
  isLoading,
  disabled,
}: CacheGroupsSectionProps) {
  if (!groups || groups.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cache Groups</CardTitle>
          <CardDescription>No cache groups available</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 dark:text-slate-400">Cache groups could not be loaded.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <Card key={group.group} className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg capitalize">{group.group} Caches</CardTitle>
                  <Badge variant="outline">{group.count} patterns</Badge>
                  {group.memoryUsage && (
                    <Badge variant="secondary">{(group.memoryUsage / 1024).toFixed(1)} KB</Badge>
                  )}
                </div>
                <CardDescription className="mt-1">{group.description}</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onInvalidate?.(group.group)}
                disabled={disabled || isLoading}
                className="gap-1"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Clear</span>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="space-y-2">
              {group.patterns.map((pattern) => (
                <div
                  key={pattern.key}
                  className="flex items-center justify-between rounded-lg bg-slate-50 p-3 dark:bg-slate-800"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900 dark:text-white truncate">{pattern.name}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                      Pattern: <code className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono">{pattern.key}</code>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{pattern.description}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onInvalidatePattern?.(pattern.key)}
                    disabled={disabled || isLoading}
                    className="gap-1 ml-2 flex-shrink-0"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
