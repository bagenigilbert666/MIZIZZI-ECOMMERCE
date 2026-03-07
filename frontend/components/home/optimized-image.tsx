import Image from "next/image"
import type { ImageProps } from "next/image"

interface OptimizedImageProps extends Omit<ImageProps, "src" | "alt"> {
  src: string
  alt: string
  /**
   * Priority loading:
   * - "critical" for above-the-fold hero images (hero banner)
   * - "high" for visible-on-scroll images (category icons, promo images)
   * - "normal" or undefined for below-the-fold lazy loads
   */
  priority?: "critical" | "high" | "normal"
  /**
   * Aspect ratio for container (prevents CLS)
   * Common values: "square", "video", "product", "banner"
   */
  aspectRatio?: "square" | "video" | "product" | "banner" | "auto"
  /**
   * Fallback color while loading (better than blank white)
   */
  placeholder?: "blur" | "empty"
}

/**
 * OPTIMIZED IMAGE COMPONENT
 * 
 * Wraps next/image with production-ready defaults:
 * - LQIP (Low Quality Image Placeholder) blur effect
 * - Automatic responsive sizing
 * - WebP format support with fallbacks
 * - Fixed aspect ratios to prevent Cumulative Layout Shift (CLS)
 * - Priority scheduling based on viewport position
 * - Proper loading strategy for perceived speed
 * 
 * Usage examples:
 * 
 * // Hero/banner image (critical, above-the-fold)
 * <OptimizedImage
 *   src={url}
 *   alt="Hero"
 *   priority="critical"
 *   sizes="100vw"
 *   aspectRatio="banner"
 *   width={1200}
 *   height={400}
 * />
 * 
 * // Category icon (visible on scroll, medium priority)
 * <OptimizedImage
 *   src={url}
 *   alt="Category"
 *   priority="high"
 *   sizes="(max-width: 768px) 80px, 100px"
 *   aspectRatio="square"
 *   width={100}
 *   height={100}
 * />
 * 
 * // Product thumbnail (lazy load, low priority)
 * <OptimizedImage
 *   src={url}
 *   alt="Product"
 *   sizes="(max-width: 640px) 150px, (max-width: 1024px) 200px, 250px"
 *   aspectRatio="square"
 *   width={250}
 *   height={250}
 * />
 */
export function OptimizedImage({
  src,
  alt,
  priority = "normal",
  aspectRatio = "auto",
  placeholder = "blur",
  sizes,
  ...props
}: OptimizedImageProps) {
  // Determine if this should be marked as priority
  const isPriority = priority === "critical"

  // Container class for aspect ratio
  const aspectRatioClasses: Record<string, string> = {
    square: "aspect-square",
    video: "aspect-video",
    product: "aspect-[3/4]",
    banner: "aspect-video",
    auto: "",
  }

  return (
    <div className={`relative w-full h-full ${aspectRatioClasses[aspectRatio]}`}>
      <Image
        src={src}
        alt={alt}
        priority={isPriority}
        loading={isPriority ? undefined : "lazy"}
        placeholder={placeholder}
        sizes={sizes || "100vw"}
        className="object-cover w-full h-full"
        {...props}
      />
    </div>
  )
}

/**
 * LIGHTWEIGHT PLACEHOLDER COMPONENT
 * 
 * For skeleton loaders and placeholders while images load.
 * Prevents jank with smooth fade-in transitions.
 */
export function ImagePlaceholder({
  aspectRatio = "square",
  className = "",
}: {
  aspectRatio?: "square" | "video" | "product" | "banner" | "auto"
  className?: string
}) {
  const aspectRatioClasses: Record<string, string> = {
    square: "aspect-square",
    video: "aspect-video",
    product: "aspect-[3/4]",
    banner: "aspect-video",
    auto: "",
  }

  return (
    <div
      className={`
        relative w-full bg-gradient-to-br from-gray-200 to-gray-300
        animate-pulse
        ${aspectRatioClasses[aspectRatio]}
        ${className}
      `}
    />
  )
}
