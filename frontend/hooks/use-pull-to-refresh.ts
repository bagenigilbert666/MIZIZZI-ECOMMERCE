"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"

interface UsePullToRefreshOptions {
  threshold?: number
  maxPullDistance?: number
  onRefresh?: () => Promise<void> | void
  disabled?: boolean
}

export function usePullToRefresh({
  threshold = 80,
  maxPullDistance = 150,
  onRefresh,
  disabled = false,
}: UsePullToRefreshOptions = {}) {
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startY = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    
    try {
      if (onRefresh) {
        await onRefresh()
      } else {
        // Default behavior: refresh the page
        router.refresh()
        // Add a small delay to show the animation
        await new Promise(resolve => setTimeout(resolve, 800))
      }
    } catch (error) {
      console.error("[v0] Pull to refresh error:", error)
    } finally {
      setIsRefreshing(false)
      setPullDistance(0)
      setIsPulling(false)
    }
  }, [onRefresh, router])

  useEffect(() => {
    if (disabled) return

    const container = containerRef.current
    if (!container) return

    const handleTouchStart = (e: TouchEvent) => {
      // Allow pull to refresh from anywhere on the page
      startY.current = e.touches[0].pageY
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (isRefreshing) return

      const currentY = e.touches[0].pageY
      const distance = currentY - startY.current

      // Only trigger when pulling down (positive distance)
      if (distance > 0) {
        // Prevent default scrolling when pulling down
        e.preventDefault()
        
        setIsPulling(true)
        
        // Apply resistance effect - the further you pull, the slower it moves
        const resistance = 2.5
        const adjustedDistance = Math.min(distance / resistance, maxPullDistance)
        setPullDistance(adjustedDistance)
      }
    }

    const handleTouchEnd = () => {
      if (!isPulling) return

      if (pullDistance >= threshold) {
        handleRefresh()
      } else {
        setPullDistance(0)
        setIsPulling(false)
      }
    }

    container.addEventListener("touchstart", handleTouchStart, { passive: true })
    container.addEventListener("touchmove", handleTouchMove, { passive: false })
    container.addEventListener("touchend", handleTouchEnd, { passive: true })

    return () => {
      container.removeEventListener("touchstart", handleTouchStart)
      container.removeEventListener("touchmove", handleTouchMove)
      container.removeEventListener("touchend", handleTouchEnd)
    }
  }, [disabled, isPulling, pullDistance, threshold, isRefreshing, maxPullDistance, handleRefresh])

  // Calculate if user has pulled far enough to trigger refresh
  const isReady = isPulling && pullDistance >= threshold && !isRefreshing

  return {
    containerRef,
    isPulling,
    pullDistance,
    isRefreshing,
    threshold,
    isReady,
  }
}
