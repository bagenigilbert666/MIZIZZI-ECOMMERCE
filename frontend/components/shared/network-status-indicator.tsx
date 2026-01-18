"use client"

import { Loader2 } from "lucide-react"

interface PullToRefreshIndicatorProps {
  pullDistance: number
  isRefreshing: boolean
  threshold: number
  isReady: boolean
}

export function PullToRefreshIndicator({
  pullDistance,
  isRefreshing,
  threshold,
  isReady,
}: PullToRefreshIndicatorProps) {
  const opacity = Math.min(pullDistance / threshold, 1)
  const scale = Math.min(pullDistance / threshold, 1)
  const rotation = isRefreshing ? 0 : (pullDistance / threshold) * 360

  return (
    <div
      className="fixed top-0 left-0 right-0 flex items-center justify-center pointer-events-none z-50"
      style={{
        transform: `translateY(${Math.min(pullDistance, threshold + 20)}px)`,
        transition: isRefreshing || pullDistance === 0 ? "transform 0.3s ease-out" : "none",
      }}
    >
      <div
        className="flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-lg border border-gray-100"
        style={{
          opacity,
          transform: `scale(${scale})`,
          transition: pullDistance === 0 ? "opacity 0.3s ease-out, transform 0.3s ease-out" : "none",
        }}
      >
        <Loader2
          className={`w-6 h-6 transition-colors ${isReady ? "text-green-500" : "text-[#8B1538]"}`}
          style={{
            transform: `rotate(${rotation}deg)`,
            animation: isRefreshing ? "spin 1s linear infinite" : "none",
          }}
        />
      </div>
    </div>
  )
}
