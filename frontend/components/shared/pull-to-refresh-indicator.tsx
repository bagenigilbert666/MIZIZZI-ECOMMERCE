"use client"

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
  const progress = Math.min(pullDistance / threshold, 1)
  const opacity = Math.min(pullDistance / threshold, 1)

  return (
    <div
      className="fixed top-0 left-0 right-0 flex items-center justify-center pointer-events-none z-50 pt-4"
      style={{
        transform: `translateY(${Math.min(pullDistance * 0.5, threshold)}px)`,
        transition: isRefreshing || pullDistance === 0 ? "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)" : "none",
      }}
    >
      <div
        className="relative flex items-center justify-center w-10 h-10"
        style={{
          opacity,
          transform: `scale(${Math.min(progress, 1)})`,
          transition: pullDistance === 0 ? "opacity 0.3s ease-out, transform 0.3s ease-out" : "none",
        }}
      >
        {/* Circular progress ring like native browsers */}
        <svg
          className="w-10 h-10 -rotate-90"
          viewBox="0 0 40 40"
        >
          {/* Background circle */}
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke="rgba(0, 0, 0, 0.1)"
            strokeWidth="3"
          />
          {/* Progress circle */}
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke={isReady ? "#10b981" : "#6366f1"}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${100.53 * (isRefreshing ? 0.75 : progress)} 100.53`}
            style={{
              transition: isRefreshing ? "none" : "stroke-dasharray 0.1s ease-out",
              animation: isRefreshing ? "spin 1s linear infinite" : "none",
            }}
          />
        </svg>
        {/* Center dot */}
        <div 
          className={`absolute w-2 h-2 rounded-full transition-colors ${
            isReady ? "bg-green-500" : "bg-indigo-500"
          }`}
        />
      </div>
    </div>
  )
}
