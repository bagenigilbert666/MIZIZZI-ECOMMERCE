"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Modal } from "@/components/ui/modal"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Product } from "@/types"
import { cloudinaryService } from "@/services/cloudinary-service"
import { cn } from "@/lib/utils"

interface ImageZoomModalProps {
  product: Product
  isOpen: boolean
  onClose: () => void
  selectedImageIndex: number
}

function getProcessedImageUrls(product: Product): string[] {
  const urls: string[] = []

  if (product?.image_urls) {
    if (Array.isArray(product.image_urls)) {
      // Handle malformed array (single characters)
      if (
        product.image_urls.length > 0 &&
        typeof product.image_urls[0] === "string" &&
        product.image_urls[0].length === 1
      ) {
        try {
          const reconstructed = product.image_urls.join("")
          const parsed = JSON.parse(reconstructed)
          if (Array.isArray(parsed)) {
            parsed.forEach((u: string) => {
              if (typeof u === "string" && u.trim() && !u.startsWith("blob:")) {
                urls.push(
                  u.startsWith("http")
                    ? u
                    : cloudinaryService.generateOptimizedUrl(u, {
                        width: 1200,
                        height: 1200,
                        crop: "fit",
                        quality: 90,
                      }),
                )
              }
            })
          }
        } catch {
          // Failed to parse
        }
      } else {
        product.image_urls.forEach((u: string) => {
          if (typeof u === "string" && u.trim() && !u.startsWith("blob:")) {
            urls.push(
              u.startsWith("http")
                ? u
                : cloudinaryService.generateOptimizedUrl(u, { width: 1200, height: 1200, crop: "fit", quality: 90 }),
            )
          }
        })
      }
    } else if (typeof product.image_urls === "string") {
      try {
        const parsed = JSON.parse(product.image_urls)
        if (Array.isArray(parsed)) {
          parsed.forEach((u: string) => {
            if (typeof u === "string" && u.trim() && !u.startsWith("blob:")) {
              urls.push(
                u.startsWith("http")
                  ? u
                  : cloudinaryService.generateOptimizedUrl(u, { width: 1200, height: 1200, crop: "fit", quality: 90 }),
              )
            }
          })
        }
      } catch {
        const u = product.image_urls as string
        if (!u.startsWith("blob:")) {
          urls.push(
            u.startsWith("http")
              ? u
              : cloudinaryService.generateOptimizedUrl(u, { width: 1200, height: 1200, crop: "fit", quality: 90 }),
          )
        }
      }
    }
  }

  // Fallback to thumbnail
  if (urls.length === 0 && product?.thumbnail_url && !product.thumbnail_url.startsWith("blob:")) {
    urls.push(product.thumbnail_url)
  }

  // Final fallback
  if (urls.length === 0) {
    urls.push("/generic-product-display.png")
  }

  return urls
}

export function ImageZoomModal({ product, isOpen, onClose, selectedImageIndex }: ImageZoomModalProps) {
  const images = getProcessedImageUrls(product)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const validIndex = images.length > 0 ? Math.min(selectedImageIndex, images.length - 1) : 0
    setCurrentIndex(validIndex)
    setImageError(false)
    setImageLoaded(false)
  }, [isOpen, selectedImageIndex, images.length])

  useEffect(() => {
    setImageError(false)
    setImageLoaded(false)
  }, [currentIndex])

  const currentImageUrl = images[currentIndex] || "/generic-product-display.png"
  const productName = product?.name || "Product"

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") handleNext()
    if (e.key === "ArrowLeft") handlePrevious()
    if (e.key === "Escape") onClose()
  }

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && onClose()} title="Product Images" size="fullscreen">
      <div className="w-full h-full flex flex-col gap-4">
        {/* Main Image Area */}
        <div className="flex-1 relative bg-white flex items-center justify-center overflow-hidden rounded-lg border border-gray-200">
          {images.length > 1 && (
            <>
              <button
                onClick={handlePrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white hover:bg-gray-50 rounded-full h-12 w-12 shadow-lg z-10 border border-gray-200 flex items-center justify-center transition-all hover:scale-110"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-6 w-6 text-gray-600" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white hover:bg-gray-50 rounded-full h-12 w-12 shadow-lg z-10 border border-gray-200 flex items-center justify-center transition-all hover:scale-110"
                aria-label="Next image"
              >
                <ChevronRight className="h-6 w-6 text-gray-600" />
              </button>
            </>
          )}

          <div className="w-full h-full flex items-center justify-center px-8 py-6">
            {imageError ? (
              <div className="flex flex-col items-center justify-center text-gray-400">
                <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <span className="text-sm font-medium">Image not available</span>
              </div>
            ) : (
              <>
                {!imageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/50">
                    <div className="w-10 h-10 border-3 border-gray-300 border-t-cherry-600 rounded-full animate-spin" />
                  </div>
                )}
                <img
                  src={currentImageUrl || "/placeholder.svg"}
                  alt={`${productName} - Image ${currentIndex + 1}`}
                  className={cn(
                    "h-full w-auto max-w-full object-contain transition-opacity duration-200",
                    imageLoaded ? "opacity-100" : "opacity-0",
                  )}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                  draggable={false}
                />
              </>
            )}
          </div>
        </div>

        {/* Thumbnails Area */}
        {images.length > 1 && (
          <div className="flex-shrink-0 py-3 px-4 border-t border-gray-200 bg-gray-50/50 rounded-lg">
            <div className="flex gap-3 justify-center overflow-x-auto pb-2">
              {images.map((image, index) => (
                <button
                  key={index}
                  className={cn(
                    "relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden transition-all border-2",
                    currentIndex === index
                      ? "border-cherry-600 ring-2 ring-cherry-200"
                      : "border-gray-200 opacity-70 hover:opacity-100 hover:border-gray-300",
                  )}
                  onClick={() => setCurrentIndex(index)}
                  aria-label={`View image ${index + 1}`}
                  title={`Image ${index + 1}`}
                >
                  <img
                    src={image || "/generic-product-display.png"}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      if (!target.src.includes("generic-product-display")) {
                        target.src = "/generic-product-display.png"
                      }
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Counter */}
        {images.length > 1 && (
          <div className="text-center text-sm text-gray-500">
            Image {currentIndex + 1} of {images.length}
          </div>
        )}
      </div>
    </Modal>
  )
}
