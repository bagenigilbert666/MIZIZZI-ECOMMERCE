"use client"

import type React from "react"
import { useState, useEffect, useCallback, memo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import Image from "next/image"
import type { Product as BaseProduct } from "@/types"
import { productService } from "@/services/product"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cloudinaryService } from "@/services/cloudinary-service"

type Product = BaseProduct & { color_options?: string[]; stock?: number }

function getProductImageUrl(product: Product): string {
  // Check for image_urls array first
  if (product.image_urls && product.image_urls.length > 0) {
    // If it's a Cloudinary public ID, generate URL:
    if (typeof product.image_urls[0] === "string" && !product.image_urls[0].startsWith("http")) {
      return cloudinaryService.generateOptimizedUrl(product.image_urls[0])
    }
    return product.image_urls[0]
  }

  // Then check for thumbnail_url
  if (product.thumbnail_url) {
    // If it's a Cloudinary public ID, generate URL:
    if (typeof product.thumbnail_url === "string" && !product.thumbnail_url.startsWith("http")) {
      return cloudinaryService.generateOptimizedUrl(product.thumbnail_url)
    }
    return product.thumbnail_url
  }

  // Check for images array with url property
  if (product.images && product.images.length > 0 && product.images[0].url) {
    // If it's a Cloudinary public ID, generate URL:
    if (typeof product.images[0].url === "string" && !product.images[0].url.startsWith("http")) {
      return cloudinaryService.generateOptimizedUrl(product.images[0].url)
    }
    return product.images[0].url
  }

  // Fallback to placeholder
  return "/placeholder.svg?height=300&width=300"
}

const LogoPlaceholder = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-white">
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="relative h-12 w-12 sm:h-16 sm:w-16"
    >
      <Image
        src="/images/screenshot-20from-202025-02-18-2013-30-22.png"
        alt="Loading"
        fill
        className="object-contain"
      />
    </motion.div>
  </div>
)

const ProductCard = memo(({ product, isMobile }: { product: Product; isMobile: boolean }) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [showPlaceholder, setShowPlaceholder] = useState(true)
  const [isHovering, setIsHovering] = useState(false)

  const discountPercentage = product.sale_price
    ? Math.round(((product.price - (product.sale_price as number)) / product.price) * 100)
    : 0

  // Handle image load success
  const handleImageLoad = () => {
    setImageLoaded(true)
    // Add a small delay to show the smooth transition
    setTimeout(() => {
      setShowPlaceholder(false)
    }, 400)
  }

  // Handle image load error
  const handleImageError = () => {
    setImageError(true)
    setImageLoaded(false)
    // Keep placeholder visible on error
  }

  // Reset states when product changes
  useEffect(() => {
    setImageLoaded(false)
    setImageError(false)
    setShowPlaceholder(true)
  }, [product.id])

  // Determine the image URL to use
  const imageUrl = getProductImageUrl(product)

  return (
    <Link href={`/product/${product.slug || product.id}`} prefetch={false} className="block h-full">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        onHoverStart={() => setIsHovering(true)}
        onHoverEnd={() => setIsHovering(false)}
        whileHover={{ y: -4, scale: 1.02 }}
        className="h-full"
      >
        <div className="group h-full overflow-hidden bg-white rounded-lg border border-gray-100 transition-all duration-300 ease-out hover:shadow-[0_6px_16px_rgba(0,0,0,0.08)] hover:border-gray-200 flex-shrink-0">
          <div className={`relative overflow-hidden bg-[#f5f5f7] aspect-[4/3]`}>
            <AnimatePresence>
              {(showPlaceholder || imageError) && (
                <motion.div
                  initial={{ opacity: 1 }}
                  exit={{
                    opacity: 0,
                    scale: 1.1,
                    transition: { duration: 0.6, ease: "easeInOut" },
                  }}
                  className="absolute inset-0 z-10"
                >
                  <LogoPlaceholder />
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{
                opacity: imageLoaded ? 1 : 0,
                scale: imageLoaded ? (isHovering ? 1.05 : 1) : 1.1,
              }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <Image
                src={imageUrl || "/placeholder.svg"}
                alt={product.name}
                fill
                sizes={
                  isMobile
                    ? "50vw"
                    : "(max-width: 640px) 45vw, (max-width: 768px) 30vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                }
                className="object-cover transition-opacity duration-300"
                loading="lazy"
                onLoad={handleImageLoad}
                onError={handleImageError}
                placeholder="blur"
                blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgdmVyc2lvbj0iMS4xIiB4bWxuczpsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSMjZWVlZWVlIiAvPjwvc3ZnPg=="
              />
            </motion.div>

            {/* Sale Badge with Apple-like styling */}
            {product.sale_price && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5, duration: 0.3 }}
                className={`absolute left-0 top-1 rounded-full bg-[#fa5252] px-1 py-0.5 font-medium text-white z-20 ${
                  isMobile ? "text-[8px]" : "text-[10px]"
                }`}
              >
                -{discountPercentage}%
              </motion.div>
            )}
          </div>

          <div className={`space-y-0.5 ${isMobile ? "p-2" : "p-3"}`}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              className="mb-1"
            >
              <span
                className={`inline-block rounded-sm bg-red-50 px-1 py-0.5 font-medium text-red-700 ${
                  isMobile ? "text-[8px]" : "text-[10px]"
                }`}
              >
                TODAY ONLY
              </span>
            </motion.div>

            {/* Product details with Apple-like typography and staggered animation */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              className="space-y-1"
            >
              <h3
                className={`line-clamp-2 font-medium leading-tight text-gray-900 ${isMobile ? "text-xs" : "text-sm"}`}
              >
                {product.name}
              </h3>

              {/* Pricing with Apple-like styling */}
              <div>
                <motion.span
                  className={`font-semibold text-gray-900 ${isMobile ? "text-sm" : "text-base"}`}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                >
                  KSh {(product.sale_price || product.price).toLocaleString()}
                </motion.span>
                {product.sale_price && (
                  <div className={`text-gray-500 line-through ${isMobile ? "text-xs" : "text-sm"}`}>
                    KSh {product.price.toLocaleString()}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Apple-like "Available" indicator */}
            {(product.stock ?? 0) > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.3 }}
                className="flex items-center mt-2"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1.5"></div>
                <span className={`text-gray-500 ${isMobile ? "text-[8px]" : "text-[10px]"}`}>Available</span>
              </motion.div>
            )}

            {/* Out of stock indicator */}
            {(product.stock ?? 0) === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.3 }}
                className="flex items-center mt-2"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-gray-300 mr-1.5"></div>
                <span className={`text-gray-500 ${isMobile ? "text-[8px]" : "text-[10px]"}`}>Out of stock</span>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  )
})

ProductCard.displayName = "ProductCard"

const DailyFindsSkeleton = ({ count = 12 }: { count?: number }) => (
  <section className="w-full mb-4 sm:mb-8">
    <div className="w-full bg-white rounded-lg overflow-hidden shadow-sm">
      <div className="bg-white flex items-center justify-between px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-gray-100">
        <div className="h-5 w-40 bg-gray-200 rounded animate-pulse sm:h-6" />
        <div className="h-4 w-16 bg-gray-200 rounded animate-pulse sm:h-5 sm:w-20" />
      </div>

      <div className="p-3 sm:p-4 md:p-6">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2 md:grid-cols-4 md:gap-3 lg:grid-cols-5 lg:gap-3 xl:grid-cols-5 xl:gap-3 2xl:grid-cols-6 2xl:gap-4">
          {[...Array(count)].map((_, i) => (
            <motion.div
              key={i}
              role="listitem"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col bg-white"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#f5f5f7]">
                <motion.div
                  animate={{ backgroundPosition: ["0% 0%", "100% 100%"], opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 1.4, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                  className="absolute inset-0 bg-gradient-to-r from-[#f5f5f7] via-[#e0e0e3] to-[#f5f5f7] bg-[length:400%_400%]"
                />
              </div>
              <div className="space-y-2 p-2 sm:p-3">
                <Skeleton className="h-3 w-3/4 rounded-full bg-[#f5f5f7]" />
                <Skeleton className="h-3 w-1/2 rounded-full bg-[#f5f5f7]" />
                <Skeleton className="h-4 w-1/3 rounded-full bg-[#f5f5f7]" />
                <div className="flex gap-1.5 pt-1">
                  <Skeleton className="h-3 w-3 rounded-full bg-[#f5f5f7]" />
                  <Skeleton className="h-3 w-3 rounded-full bg-[#f5f5f7]" />
                  <Skeleton className="h-3 w-3 rounded-full bg-[#f5f5f7]" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  </section>
)

export function DailyFinds() {
  const [dailyFinds, setDailyFinds] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const isMobile = useMediaQuery("(max-width: 640px)")

  const fetchDailyFinds = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const products = await productService.getDailyFindProducts(12)

      if (products && products.length > 0) {
        setDailyFinds(products.slice(0, 12))
      } else {
        // Fallback handled by backend now, but keeping empty check
        setDailyFinds([])
      }
    } catch (error) {
      console.error("Error fetching daily finds:", error)
      setError("Failed to load daily finds")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    const fetchData = async () => {
      try {
        await fetchDailyFinds()
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Error in daily finds fetch:", error)
        }
      }
    }

    fetchData()

    return () => {
      controller.abort()
    }
  }, [fetchDailyFinds])

  const handleViewAll = (e: React.MouseEvent) => {
    e.preventDefault()
    router.push("/products")
  }

  if (loading) {
    return <DailyFindsSkeleton count={12} />
  }

  if (error || !dailyFinds || dailyFinds.length === 0) {
    return null
  }

  return (
    <section className="w-full mb-4 sm:mb-8">
      <div className="w-full bg-white rounded-lg overflow-hidden shadow-sm">
        <div className="bg-white flex items-center justify-between px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900 sm:text-base md:text-lg">Daily Finds | Today Only</h2>

          <button
            onClick={handleViewAll}
            className="flex items-center gap-1 text-xs font-semibold text-[#f68b1e] transition-colors hover:text-[#d97a19] sm:text-sm"
          >
            See All
            <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>
        </div>

        <div className="p-3 sm:p-4 md:p-6">
          <motion.div
            role="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2 md:grid-cols-4 md:gap-3 lg:grid-cols-5 lg:gap-3 xl:grid-cols-5 xl:gap-3 2xl:grid-cols-6 2xl:gap-4"
          >
            {dailyFinds.map((product, index) => (
              <ProductCard key={`${product.id}-${index}`} product={product} isMobile={isMobile} />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
