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
  const handleRefresh = useCallback(async () => {
    // Reload the entire page
    window.location.reload()
  }, [])

  const { pullDistance, isRefreshing } = usePullToRefresh({
    onRefresh: disabled ? undefined : handleRefresh,
    threshold,
  })

  // Calculate opacity and scale based on pull distance
  const progress = Math.min(pullDistance / threshold, 1)
  const opacity = Math.min(progress * 1.5, 1)
  const scale = 0.6 + progress * 0.4
  const rotation = progress * 180

  // derive booleans from pullDistance
  const isPulling = pullDistance > 0
  const shouldTriggerRefresh = pullDistance >= threshold

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
        className="relative flex items-center justify-center w-14 h-14 rounded-full shadow-lg"
        style={{
          background: "linear-gradient(135deg, #DC143C 0%, #8B1538 100%)",
          opacity,
          transform: `scale(${scale})`,
          transition: isPulling ? "none" : "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: "0 4px 12px rgba(220, 20, 60, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1)",
        }}
      >
        {/* Inner glow effect */}
        <div 
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(circle at center, rgba(255, 255, 255, 0.3) 0%, transparent 70%)",
          }}
        />
        
        {isRefreshing ? (
          <Loader2 className="w-7 h-7 text-white animate-spin relative z-10" />
        ) : shouldTriggerRefresh ? (
          <RefreshCw 
            className="w-7 h-7 text-white relative z-10"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: "transform 0.1s linear",
              filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2))",
            }}
          />
        ) : (
          <ArrowDown
            className="w-7 h-7 text-white relative z-10"
            style={{
              transform: `translateY(${progress * 4}px)`,
              transition: "transform 0.1s linear",
              filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2))",
            }}
          />
        )}
      </div>
    </div>
  )
}
