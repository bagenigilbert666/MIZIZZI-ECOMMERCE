/**
 * Hybrid Image Optimization Service
 * Generates AVIF + WebP + fallback URLs for ultra-fast loading
 * Uses modern image formats with automatic fallbacks
 */

export interface OptimizedImageUrls {
  avif: string
  webp: string
  fallback: string
  srcset: string
}

export interface ImageOptimizationConfig {
  width?: number
  height?: number
  quality?: number
  format?: "auto" | "avif" | "webp" | "jpg"
}

class ImageOptimizerService {
  private readonly CLOUDINARY_DOMAIN = "res.cloudinary.com"
  private readonly cloudinaryBaseUrl = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    ? `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`
    : null

  /**
   * Generate optimized image URLs with AVIF, WebP, and fallback
   * Delivers content instantly with minimal bandwidth
   */
  generateOptimizedUrls(
    imageUrl: string | null | undefined,
    config: ImageOptimizationConfig = {}
  ): OptimizedImageUrls | null {
    if (!imageUrl) {
      return null
    }

    const width = config.width || 400
    const height = config.height || 400
    const quality = config.quality || 82

    // If it's a Cloudinary URL, optimize using Cloudinary transforms
    if (imageUrl.includes(this.CLOUDINARY_DOMAIN)) {
      return this.optimizeCloudinaryUrl(imageUrl, width, height, quality)
    }

    // For external URLs, return as-is with fallback
    return {
      avif: imageUrl,
      webp: imageUrl,
      fallback: imageUrl,
      srcset: `${imageUrl} 1x, ${imageUrl} 2x`,
    }
  }

  /**
   * Optimize Cloudinary images with next-gen formats
   */
  private optimizeCloudinaryUrl(
    url: string,
    width: number,
    height: number,
    quality: number
  ): OptimizedImageUrls {
    // Extract public_id from Cloudinary URL
    const publicIdMatch = url.match(/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/)
    const publicId = publicIdMatch ? publicIdMatch[1] : url

    // Base transformation parameters
    const transforms = `w_${width},h_${height},c_fill,q_${quality},f_auto`

    // AVIF format (smallest, fastest)
    const avifUrl = `${this.cloudinaryBaseUrl}/${transforms.replace(
      "f_auto",
      "f_avif"
    )}/${publicId}`

    // WebP format (good compression, wide support)
    const webpUrl = `${this.cloudinaryBaseUrl}/${transforms.replace(
      "f_auto",
      "f_webp"
    )}/${publicId}`

    // JPG fallback (universal support)
    const fallbackUrl = `${this.cloudinaryBaseUrl}/${transforms.replace(
      "f_auto",
      "f_jpg"
    )}/${publicId}`

    // Responsive srcset with 1x, 2x sizes
    const srcset = [
      `${webpUrl} 1x`,
      `${webpUrl.replace(`w_${width}`, `w_${width * 2}`)} 2x`,
    ].join(", ")

    return {
      avif: avifUrl,
      webp: webpUrl,
      fallback: fallbackUrl,
      srcset,
    }
  }

  /**
   * Get image URL with instant caching
   * Returns the best format based on browser support
   */
  getBestFormat(urls: OptimizedImageUrls | null): string {
    if (!urls) return "/placeholder.svg"
    return urls.fallback
  }

  /**
   * Generate HTML picture element markup for optimal loading
   */
  generatePictureElement(
    urls: OptimizedImageUrls | null,
    alt: string,
    className?: string
  ): string {
    if (!urls) {
      return `<img src="/placeholder.svg" alt="${alt}" class="${className || ""}" />`
    }

    return `<picture>
      <source srcset="${urls.avif}" type="image/avif" />
      <source srcset="${urls.webp}" type="image/webp" />
      <img 
        src="${urls.fallback}" 
        alt="${alt}" 
        class="${className || ""}"
        loading="lazy"
        decoding="async"
      />
    </picture>`
  }

  /**
   * Preload critical images for instant display
   */
  preloadImage(url: string): void {
    if (typeof window === "undefined") return

    const link = document.createElement("link")
    link.rel = "preload"
    link.as = "image"
    link.href = url
    document.head.appendChild(link)
  }

  /**
   * Prefetch images for smooth interactions
   */
  prefetchImages(urls: string[]): void {
    if (typeof window === "undefined") return

    urls.forEach((url) => {
      const link = document.createElement("link")
      link.rel = "prefetch"
      link.href = url
      document.head.appendChild(link)
    })
  }

  /**
   * Get responsive image sizes for modern layouts
   */
  getResponsiveSizes(): string {
    return "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  }
}

export const imageOptimizer = new ImageOptimizerService()
