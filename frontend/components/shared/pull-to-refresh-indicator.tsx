"use client"

interface PullToRefreshIndicatorProps {
  pullDistance: number
  isRefreshing: boolean
  threshold?: number
}

export function PullToRefreshIndicator({
  pullDistance,
  isRefreshing,
  threshold = 70,
}: PullToRefreshIndicatorProps) {
  const progress = Math.min((pullDistance / threshold) * 100, 100)
  const isActive = pullDistance > 0 || isRefreshing

  if (!isActive) return null

  // Calculate smooth movement - follows pull distance more closely
  const translateY = Math.min(pullDistance * 0.4, 30)
  const opacity = Math.min(pullDistance / 20, 1)
  const scale = Math.min(0.7 + (pullDistance / threshold) * 0.3, 1)

  return (
    <div
      className="fixed top-2 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none"
      style={{
        transform: `translate(-50%, ${translateY}px) scale(${scale})`,
        opacity: opacity,
        transition: pullDistance === 0 ? "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)" : "none",
        willChange: "transform, opacity",
      }}
    >
      <div
        className="relative flex items-center justify-center"
        style={{
          width: "24px",
          height: "24px",
        }}
      >
        {/* Cherry-colored circular spinner */}
        <svg
          className="absolute inset-0"
          viewBox="0 0 24 24"
          style={{
            transform: isRefreshing ? "rotate(0deg)" : `rotate(${progress * 3.6}deg)`,
            transition: isRefreshing ? "none" : "transform 0.08s ease-out",
            animation: isRefreshing ? "spin 0.7s linear infinite" : "none",
          }}
        >
          {/* Background circle */}
          <circle
            cx="12"
            cy="12"
            r="10"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="2.5"
            opacity="0.25"
          />
          {/* Progress circle */}
          <circle
            cx="12"
            cy="12"
            r="10"
            fill="none"
            stroke="#8B1538"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="62.83"
            strokeDashoffset={62.83 - (62.83 * progress) / 100}
            style={{
              transition: pullDistance === 0 ? "stroke-dashoffset 0.25s ease" : "stroke-dashoffset 0.08s ease-out",
            }}
          />
        </svg>
        
        {/* Center dot for feedback */}
        {progress > 30 && (
          <div
            className="absolute rounded-full"
            style={{
              width: "5px",
              height: "5px",
              backgroundColor: "#8B1538",
              opacity: Math.min((progress - 30) / 40, 0.8),
              transform: `scale(${Math.min(progress / 80, 1)})`,
              transition: "all 0.15s ease-out",
            }}
          />
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}
