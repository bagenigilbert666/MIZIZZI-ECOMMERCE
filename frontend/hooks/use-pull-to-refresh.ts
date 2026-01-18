"use client"

import { useEffect, useRef, useState, useCallback } from "react"

interface PullToRefreshOptions {
  threshold?: number
  resistance?: number
  onRefresh?: () => void
}

export function usePullToRefresh({
  threshold = 70,
  resistance = 2.5,
  onRefresh,
}: PullToRefreshOptions = {}) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startY = useRef(0)
  const currentY = useRef(0)
  const isPulling = useRef(false)
  const canPull = useRef(false)

  const triggerRefresh = useCallback(() => {
    setIsRefreshing(true)
    setPullDistance(0)
    
    // Trigger browser's native refresh after brief visual feedback
    setTimeout(() => {
      window.location.reload()
    }, 150)
  }, [])

  useEffect(() => {
    // Only enable on touch devices
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    
    if (!isTouchDevice) return

    const handleTouchStart = (e: TouchEvent) => {
      if (isRefreshing) return
      
      // Find the scrollable container
      const scrollableElement = document.querySelector('[class*="overflow-y-auto"]') as HTMLElement
      const scrollTop = scrollableElement ? scrollableElement.scrollTop : window.pageYOffset
      
      // Only allow pull at the very top
      if (scrollTop <= 0) {
        canPull.current = true
        startY.current = e.touches[0].clientY
      } else {
        canPull.current = false
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!canPull.current || isRefreshing) return

      currentY.current = e.touches[0].clientY
      const diff = currentY.current - startY.current

      // Only track if pulling down
      if (diff > 0) {
        const scrollableElement = document.querySelector('[class*="overflow-y-auto"]') as HTMLElement
        const scrollTop = scrollableElement ? scrollableElement.scrollTop : window.pageYOffset
        
        // Ensure we're still at the top
        if (scrollTop <= 0) {
          isPulling.current = true
          
          // Prevent bounce effect on iOS and default pull behavior
          e.preventDefault()
          
          // Apply resistance (mimics Jumia's feel)
          const distance = Math.pow(diff, 0.85) / resistance
          const maxDistance = threshold * 1.2
          setPullDistance(Math.min(distance, maxDistance))
        }
      } else {
        isPulling.current = false
        setPullDistance(0)
      }
    }

    const handleTouchEnd = () => {
      if (!isPulling.current || isRefreshing) {
        isPulling.current = false
        canPull.current = false
        setPullDistance(0)
        return
      }

      isPulling.current = false
      canPull.current = false

      // Trigger refresh if pulled past threshold
      if (pullDistance >= threshold) {
        triggerRefresh()
      } else {
        // Snap back smoothly
        setPullDistance(0)
      }
    }

    // Add listeners - touchmove needs passive: false to call preventDefault
    document.addEventListener("touchstart", handleTouchStart, { passive: true })
    document.addEventListener("touchmove", handleTouchMove, { passive: false })
    document.addEventListener("touchend", handleTouchEnd, { passive: true })
    document.addEventListener("touchcancel", handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener("touchstart", handleTouchStart)
      document.removeEventListener("touchmove", handleTouchMove)
      document.removeEventListener("touchend", handleTouchEnd)
      document.removeEventListener("touchcancel", handleTouchEnd)
    }
  }, [pullDistance, threshold, resistance, isRefreshing, triggerRefresh])

  return { pullDistance, isRefreshing }
}
