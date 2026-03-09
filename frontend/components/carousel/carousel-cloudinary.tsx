"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import type { CarouselBanner } from "@/types/carousel-admin"

interface CarouselCloudinaryProps {
  banners: CarouselBanner[]
  autoPlay?: boolean
  interval?: number
  onBannerClick?: (banner: CarouselBanner) => void
}

/**
 * Fast carousel component optimized for Cloudinary CDN delivery
 * Features:
 * - Uses Cloudinary's responsive image URLs for instant load
 * - Automatic format optimization (WebP, JPEG)
 * - Global CDN acceleration
 * - Blur-up LQIP transitions
 * - Responsive images for all devices
 * - Instant display with cached URLs
 */
export function CarouselCloudinary({
  banners,
  autoPlay = true,
  interval = 5000,
  onBannerClick,
}: CarouselCloudinaryProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [imageLoaded, setImageLoaded] = useState<Record<number, boolean>>({})

  // Generate Cloudinary responsive URL with caching and optimization
  const getCloudinaryUrl = useCallback((imageUrl: string, width: number = 1400, height: number = 500) => {
    if (!imageUrl) return "/placeholder.svg"
    
    // If not a Cloudinary URL, return as-is
    if (!imageUrl.includes("cloudinary.com")) {
      return imageUrl
    }

    // Cloudinary URL optimization for CDN delivery
    // Format: /w_WIDTH,h_HEIGHT,c_fill,q_auto,f_auto/image.jpg
    try {
      const url = new URL(imageUrl)
      const pathParts = url.pathname.split("/")
      
      // Find the image filename (usually the last part)
      const imageFileName = pathParts[pathParts.length - 1]
      const cloudName = url.hostname.split(".")[0]
      
      // Construct optimized Cloudinary URL with:
      // w_WIDTH = responsive width
      // h_HEIGHT = responsive height  
      // c_fill = fill to dimensions
      // q_auto = auto quality optimization
      // f_auto = auto format selection (WebP, JPEG, etc)
      // dpr_auto = device pixel ratio
      const optimizedUrl = `https://res.cloudinary.com/${cloudName}/image/upload/w_${width},h_${height},c_fill,q_auto,f_auto,dpr_auto/${imageFileName}`
      
      return optimizedUrl
    } catch (error) {
      console.error("[v0] Error parsing Cloudinary URL:", error)
      return imageUrl
    }
  }, [])

  // Get mobile, tablet, desktop variants
  const getResponsiveUrls = useCallback((imageUrl: string) => {
    return {
      mobile: getCloudinaryUrl(imageUrl, 800, 300),
      tablet: getCloudinaryUrl(imageUrl, 1000, 400),
      desktop: getCloudinaryUrl(imageUrl, 1400, 500),
    }
  }, [getCloudinaryUrl])

  useEffect(() => {
    if (!autoPlay || isPaused || banners.length <= 1) return

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length)
    }, interval)

    return () => clearInterval(timer)
  }, [autoPlay, isPaused, banners.length, interval])

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length)
  }

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length)
  }

  if (!banners || banners.length === 0) {
    return (
      <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">No banners available</p>
      </div>
    )
  }

  const currentBanner = banners[currentIndex]
  const responsiveUrls = getResponsiveUrls(currentBanner.image_url || "")

  return (
    <div
      className="relative w-full rounded-lg overflow-hidden bg-muted"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="region"
      aria-label="Featured carousel"
      aria-live="polite"
    >
      {/* Carousel Image with responsive URLs */}
      <div className="relative w-full h-64 sm:h-96 md:h-[500px]">
        {/* Use native img for Cloudinary URLs - they're already optimized CDN URLs */}
        <img
          src={responsiveUrls.desktop}
          alt={currentBanner.title || "Carousel banner"}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-700",
            imageLoaded[currentIndex] ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setImageLoaded((prev) => ({ ...prev, [currentIndex]: true }))}
        />

        {/* Placeholder blur - shows while image loads */}
        {!imageLoaded[currentIndex] && (
          <div
            className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse"
            aria-hidden="true"
          />
        )}

        {/* Content Overlay */}
        {currentBanner.title && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-4 sm:p-6 md:p-8">
            <div
              className="space-y-2 cursor-pointer"
              onClick={() => onBannerClick?.(currentBanner)}
              role="button"
              tabIndex={0}
            >
              {currentBanner.badge_text && (
                <div className="inline-block px-3 py-1 bg-white/20 text-white text-sm font-semibold rounded-full max-w-fit">
                  {currentBanner.badge_text}
                </div>
              )}
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white line-clamp-2">
                {currentBanner.title}
              </h2>
              {currentBanner.description && (
                <p className="text-sm sm:text-base text-white/90 line-clamp-2">
                  {currentBanner.description}
                </p>
              )}
              {currentBanner.discount && (
                <div className="inline-block px-3 py-1 bg-red-600 text-white font-bold rounded mt-2">
                  {currentBanner.discount}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation - Desktop */}
        {banners.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              aria-label="Previous slide"
            >
              ←
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              aria-label="Next slide"
            >
              →
            </button>
          </>
        )}
      </div>

      {/* Dot Indicators */}
      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "h-2 rounded-full transition-all",
                index === currentIndex
                  ? "bg-white w-6"
                  : "bg-white/50 w-2 hover:bg-white/70"
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Pause indicator */}
      {isPaused && banners.length > 1 && (
        <div className="absolute top-4 right-4 z-20 px-2 py-1 bg-black/50 text-white text-xs rounded">
          ⏸ Paused
        </div>
      )}
    </div>
  )
}
