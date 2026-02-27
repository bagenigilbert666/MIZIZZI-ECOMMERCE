"use client"

import type React from "react"
import { useState, memo, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface OptimizedImageProps {
  src?: string
  alt: string
  className?: string
  fallback?: React.ReactNode
  width?: number
  height?: number
  priority?: boolean
}

export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  className,
  fallback,
  width,
  height,
  priority = false,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(!priority)
  const [hasError, setHasError] = useState(false)
  const [isVisible, setIsVisible] = useState(priority)
  const imgRef = useRef<HTMLImageElement>(null)

  // Intersection observer for lazy loading
  useEffect(() => {
    if (priority || isVisible) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
            observer.unobserve(entry.target)
          }
        })
      },
      { rootMargin: "50px" } // Start loading 50px before entering viewport
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current)
      }
    }
  }, [priority, isVisible])

  if (!src || hasError) {
    return <div className={cn("flex items-center justify-center bg-gray-100", className)}>{fallback}</div>
  }

  return (
    <div className={cn("relative overflow-hidden", className)} ref={imgRef}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse">
          <div className="w-6 h-6 bg-gray-300 rounded" />
        </div>
      )}
      {isVisible && (
        <img
          src={src || "/placeholder.svg"}
          alt={alt}
          width={width}
          height={height}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-200",
            isLoading ? "opacity-0" : "opacity-100",
          )}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setHasError(true)
            setIsLoading(false)
          }}
          loading="lazy"
          decoding="async"
          // @ts-ignore - fetchPriority is valid HTML attribute
          fetchPriority={priority ? "high" : "auto"}
        />
      )}
    </div>
  )
})
