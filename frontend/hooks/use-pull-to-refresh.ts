"use client"

import { useEffect, useRef, useState, useCallback } from "react"

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>
  threshold?: number
  resistance?: number
  maxPullDistance?: number
  disabled?: boolean
}

interface PullToRefreshState {
  isPulling: boolean
  isRefreshing: boolean
  pullDistance: number
  shouldTriggerRefresh: boolean
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  resistance = 2.5,
  maxPullDistance = 150,
  disabled = false,
}: UsePullToRefreshOptions) {
  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    isRefreshing: false,
    pullDistance: 0,
    shouldTriggerRefresh: false,
  })

  const touchStartY = useRef<number>(0)
  const scrollTop = useRef<number>(0)
  const rafId = useRef<number | null>(null)

  const updatePullDistance = useCallback((distance: number) => {
    if (rafId.current) {
      cancelAnimationFrame(rafId.current)
    }

    rafId.current = requestAnimationFrame(() => {
      setState((prev) => ({
        ...prev,
        pullDistance: distance,
        shouldTriggerRefresh: distance >= threshold,
      }))
    })
  }, [threshold])

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || state.isRefreshing) return

    const scrollElement = document.querySelector('.overflow-y-auto')
    if (!scrollElement) return

    scrollTop.current = scrollElement.scrollTop
    
    // Only start pull if at the top of the page
    if (scrollTop.current === 0) {
      touchStartY.current = e.touches[0].clientY
    }
  }, [disabled, state.isRefreshing])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || state.isRefreshing || touchStartY.current === 0) return

    const scrollElement = document.querySelector('.overflow-y-auto')
    if (!scrollElement) return

    const currentScrollTop = scrollElement.scrollTop

    // Only allow pull when at the top and pulling down
    if (currentScrollTop === 0) {
      const touchY = e.touches[0].clientY
      const distance = touchY - touchStartY.current

      if (distance > 0) {
        // Apply resistance to make it feel natural
        const resistedDistance = Math.min(
          distance / resistance,
          maxPullDistance
        )

        // Prevent default scroll behavior when pulling
        if (resistedDistance > 5) {
          e.preventDefault()
          setState((prev) => ({ ...prev, isPulling: true }))
          updatePullDistance(resistedDistance)
        }
      }
    }
  }, [disabled, state.isRefreshing, resistance, maxPullDistance, updatePullDistance])

  const handleTouchEnd = useCallback(async () => {
    if (disabled || state.isRefreshing) return

    if (rafId.current) {
      cancelAnimationFrame(rafId.current)
      rafId.current = null
    }

    if (state.shouldTriggerRefresh && state.isPulling) {
      setState((prev) => ({
        ...prev,
        isRefreshing: true,
        isPulling: false,
      }))

      try {
        await onRefresh()
      } catch (error) {
        console.error("[v0] Pull to refresh error:", error)
      } finally {
        // Small delay for better UX
        setTimeout(() => {
          setState({
            isPulling: false,
            isRefreshing: false,
            pullDistance: 0,
            shouldTriggerRefresh: false,
          })
          touchStartY.current = 0
        }, 300)
      }
    } else {
      setState({
        isPulling: false,
        isRefreshing: false,
        pullDistance: 0,
        shouldTriggerRefresh: false,
      })
      touchStartY.current = 0
    }
  }, [disabled, state.isRefreshing, state.isPulling, state.shouldTriggerRefresh, onRefresh])

  useEffect(() => {
    if (disabled) return

    const options: AddEventListenerOptions = { passive: false }

    document.addEventListener("touchstart", handleTouchStart, options)
    document.addEventListener("touchmove", handleTouchMove, options)
    document.addEventListener("touchend", handleTouchEnd)
    document.addEventListener("touchcancel", handleTouchEnd)

    return () => {
      document.removeEventListener("touchstart", handleTouchStart)
      document.removeEventListener("touchmove", handleTouchMove)
      document.removeEventListener("touchend", handleTouchEnd)
      document.removeEventListener("touchcancel", handleTouchEnd)

      if (rafId.current) {
        cancelAnimationFrame(rafId.current)
      }
    }
  }, [disabled, handleTouchStart, handleTouchMove, handleTouchEnd])

  return state
}
