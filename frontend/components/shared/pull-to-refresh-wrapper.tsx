"use client"

import { usePullToRefresh } from "@/hooks/use-pull-to-refresh"
import { PullToRefreshIndicator } from "./pull-to-refresh-indicator"

export function PullToRefreshWrapper() {
  const handleRefresh = async (): Promise<void> => {
    // no-op refresh handler; replace with real refresh logic if needed
    return
  }

  const { pullDistance, isRefreshing } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
    resistance: 2.5,
  })

  return (
    <PullToRefreshIndicator
      pullDistance={pullDistance}
      isRefreshing={isRefreshing}
      threshold={80}
    />
  )
}
