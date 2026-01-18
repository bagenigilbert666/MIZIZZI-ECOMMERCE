"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface ScrollDirectionState {
  scrollDirection: "up" | "down" | null
  isAtTop: boolean
}

export function useScrollDirection(threshold = 10): ScrollDirectionState {
  const [scrollDirection, setScrollDirection] = useState<"up" | "down" | null>(null)
  const [isAtTop, setIsAtTop] = useState(true)
  const lastScrollY = useRef(0)

  const handleScroll = useCallback(() => {
    const scrollY = window.scrollY

    // Check if at top of page (within 50px threshold)
    const atTop = scrollY < 50
    setIsAtTop(atTop)

    // Calculate direction based on scroll position difference
    const difference = scrollY - lastScrollY.current

    // Only update direction if scrolled beyond threshold
    if (Math.abs(difference) >= threshold) {
      const newDirection = difference > 0 ? "down" : "up"
      setScrollDirection(newDirection)
      lastScrollY.current = scrollY
    }
  }, [threshold])

  useEffect(() => {
    // Initialize with current scroll position
    lastScrollY.current = window.scrollY
    setIsAtTop(window.scrollY < 50)

    // Add scroll listener
    window.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [handleScroll])

  return { scrollDirection, isAtTop }
}
