import { useState, useEffect, useCallback } from "react"
import type { CarouselBanner } from "@/types/carousel-admin"
import {
  getCarouselBanners,
  clearCarouselCache,
  trackCarouselView,
  trackCarouselClick,
} from "@/lib/carousel-cloudinary-service"

interface UseCarouselOptions {
  position?: string
  autoRevalidate?: boolean
  revalidateInterval?: number
}

/**
 * Hook for managing carousel banners with Cloudinary CDN optimization
 * Features:
 * - Automatic caching and instant display
 * - Background revalidation for fresh data
 * - Error handling with fallback to cache
 * - Analytics tracking
 * - Responsive to data changes
 */
export function useCarouselCloudinary(options: UseCarouselOptions = {}) {
  const {
    position = "homepage",
    autoRevalidate = true,
    revalidateInterval = 1000 * 60 * 5, // 5 minutes
  } = options

  const [banners, setBanners] = useState<CarouselBanner[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Load banners
  const loadBanners = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getCarouselBanners(position)
      setBanners(data)
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to load carousel banners")
      setError(error)
      console.error("[v0] Error loading carousel banners:", error)
    } finally {
      setIsLoading(false)
    }
  }, [position])

  // Initial load
  useEffect(() => {
    loadBanners()
  }, [loadBanners])

  // Auto-revalidation
  useEffect(() => {
    if (!autoRevalidate || revalidateInterval <= 0) return

    const timer = setInterval(() => {
      console.log(`[v0] Revalidating carousel banners for ${position}`)
      loadBanners()
    }, revalidateInterval)

    return () => clearInterval(timer)
  }, [position, autoRevalidate, revalidateInterval, loadBanners])

  // Track banner view
  const trackView = useCallback((bannerId: number) => {
    trackCarouselView(bannerId).catch(console.error)
  }, [])

  // Track banner click
  const trackClick = useCallback((bannerId: number) => {
    trackCarouselClick(bannerId).catch(console.error)
  }, [])

  // Manually refresh cache
  const refresh = useCallback(() => {
    clearCarouselCache(position)
    loadBanners()
  }, [position, loadBanners])

  return {
    banners,
    isLoading,
    error,
    refresh,
    trackView,
    trackClick,
  }
}
