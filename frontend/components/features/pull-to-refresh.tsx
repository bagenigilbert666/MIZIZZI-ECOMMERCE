"use client"

import { usePullToRefresh } from "@/hooks/use-pull-to-refresh"
import { Loader2, ArrowDown, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback } from "react"

interface PullToRefreshProps {
  disabled?: boolean
  threshold?: number
  className?: string
}

export function PullToRefresh({
  disabled = false,
  threshold = 80,
  className = "",
}: PullToRefreshProps) {
  const router = useRouter()

  const handleRefresh = useCallback(async () => {
    // Refresh the page data
    router.refresh()
    
    // Wait for the refresh to complete
    await new Promise((resolve) => setTimeout(resolve, 500))
  }, [router])

  const { isPulling, isRefreshing, pullDistance, shouldTriggerRefresh } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold,
    disabled,
  })

  // Calculate opacity and scale based on pull distance
  const progress = Math.min(pullDistance / threshold, 1)
  const opacity = Math.min(progress * 1.5, 1)
  const scale = 0.6 + progress * 0.4
  const rotation = progress * 180

  if (!isPulling && !isRefreshing) {
    return null
  }

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-center pointer-events-none ${className}`}
      style={{
        transform: `translateY(${Math.min(pullDistance, 100)}px)`,
        transition: isPulling ? "none" : "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <div
        className="flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-lg"
        style={{
          opacity,
          transform: `scale(${scale})`,
          transition: isPulling ? "none" : "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {isRefreshing ? (
          <Loader2 className="w-6 h-6 text-[#8B1538] animate-spin" />
        ) : shouldTriggerRefresh ? (
          <RefreshCw 
            className="w-6 h-6 text-[#8B1538]"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: "transform 0.1s linear",
            }}
          />
        ) : (
          <ArrowDown
            className="w-6 h-6 text-[#8B1538]"
            style={{
              transform: `translateY(${progress * 4}px)`,
              transition: "transform 0.1s linear",
            }}
          />
        )}
      </div>
    </div>
  )
}
