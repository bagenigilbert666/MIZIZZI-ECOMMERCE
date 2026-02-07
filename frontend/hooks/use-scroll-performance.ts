'use client';

import { useEffect, useRef } from 'react'

/**
 * Hook to optimize scroll performance by preventing layout thrashing
 * and using passive event listeners
 */
export function useScrollPerformance() {
  const scrollFrameRef = useRef<number | null>(null)
  const lastScrollYRef = useRef(0)

  useEffect(() => {
    // Passive scroll listener - doesn't block rendering
    const handleScroll = () => {
      // Use requestAnimationFrame for smooth 60fps scrolling
      if (scrollFrameRef.current) {
        cancelAnimationFrame(scrollFrameRef.current)
      }

      scrollFrameRef.current = requestAnimationFrame(() => {
        lastScrollYRef.current = window.scrollY
        // This is where you'd trigger scroll-based animations if needed
      })
    }

    // Add passive listener for better scroll performance
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (scrollFrameRef.current) {
        cancelAnimationFrame(scrollFrameRef.current)
      }
    }
  }, [])

  return {
    scrollY: lastScrollYRef.current,
  }
}

/**
 * Debounce scroll events to prevent excessive function calls
 */
export function debounceScroll(callback: () => void, delay: number = 16) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return () => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(callback, delay)
  }
}
