"use client"
import { useState, useEffect, useCallback, memo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { productService } from "@/services/product"
import { ShoppingBag, Star, Package } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import type { Product } from "@/types"

const LogoPlaceholder = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-white">
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="relative h-8 w-8"
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

const StarRating = ({ rating = 4, reviewCount = 0 }: { rating?: number; reviewCount?: number }) => {
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${
              star <= Math.floor(rating)
                ? "fill-yellow-400 text-yellow-400"
                : star - 0.5 <= rating
                  ? "fill-yellow-400/50 text-yellow-400"
                  : "fill-gray-200 text-gray-200"
            }`}
          />
        ))}
      </div>
      {reviewCount > 0 && (
        <span className="text-[10px] sm:text-xs text-gray-400">({reviewCount.toLocaleString()})</span>
      )}
    </div>
  )
}

const ProductCard = memo(({ product, index }: { product: Product; index: number }) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [showPlaceholder, setShowPlaceholder] = useState(true)

  const discountPercentage = product.sale_price
    ? Math.round(((product.price - product.sale_price) / product.price) * 100)
    : 0

  const handleImageLoad = () => {
    setImageLoaded(true)
    setTimeout(() => setShowPlaceholder(false), 300)
  }

  const handleImageError = () => {
    setImageError(true)
    setImageLoaded(false)
  }

  useEffect(() => {
    setImageLoaded(false)
    setImageError(false)
    setShowPlaceholder(true)
  }, [product.id])

  const imageUrl =
    (product.image_urls && product.image_urls[0]) || product.thumbnail_url || "/diverse-fashion-display.png"

  const rating = product.rating || 3 + Math.random() * 2
  const reviewCount = product.review_count || Math.floor(Math.random() * 5000) + 100

  return (
    <Link href={`/product/${product.slug || product.id}`} prefetch={false}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.02 }}
        whileHover={{ y: -2 }}
        className="h-full"
      >
        <div className="group h-full overflow-hidden bg-white border-b border-r border-gray-100 transition-all duration-200 hover:shadow-sm">
          {/* Image Container - Square aspect ratio with consistent sizing */}
          <div className="relative aspect-square overflow-hidden bg-[#f8f8f8]">
            <AnimatePresence>
              {(showPlaceholder || imageError) && (
                <motion.div
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.3 } }}
                  className="absolute inset-0 z-10"
                >
                  <LogoPlaceholder />
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: imageLoaded ? 1 : 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0"
            >
              <Image
                src={imageUrl || "/placeholder.svg"}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            </motion.div>

            {product.sale_price && discountPercentage > 0 && (
              <div className="absolute top-1 left-1 bg-[#8B1538] text-white text-[10px] sm:text-xs font-medium px-1.5 py-0.5 rounded-sm z-20">
                -{discountPercentage}%
              </div>
            )}
          </div>

          <div className="p-2 sm:p-3">
            {/* Product Name - Increased font size to match flash-sales */}
            <h3 className="text-gray-800 text-xs sm:text-sm line-clamp-2 leading-tight mb-1.5 min-h-[32px] sm:min-h-[40px]">
              {product.name}
            </h3>

            <div className="mb-1.5">
              <span className="font-semibold text-[#8B1538] text-sm sm:text-base">
                KSh {(product.sale_price || product.price).toLocaleString()}
              </span>
              {product.sale_price && (
                <span className="text-gray-400 line-through ml-1.5 text-[10px] sm:text-xs">
                  KSh {product.price.toLocaleString()}
                </span>
              )}
            </div>

            {/* Star Rating */}
            <StarRating rating={rating} reviewCount={reviewCount} />
          </div>
        </div>
      </motion.div>
    </Link>
  )
})

ProductCard.displayName = "ProductCard"

const ProductGridSkeleton = ({ count = 12 }: { count?: number }) => (
  <div className="grid grid-cols-2 gap-[1px] bg-gray-100 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
    {[...Array(count)].map((_, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.02, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white p-2 sm:p-3"
      >
        <div className="aspect-square w-full bg-[#f5f5f7] flex items-center justify-center relative overflow-hidden mb-2">
          <motion.div
            animate={{
              backgroundPosition: ["0% 0%", "100% 100%"],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
            className="absolute inset-0 bg-gradient-to-r from-[#f5f5f7] via-[#e0e0e3] to-[#f5f5f7] bg-[length:400%_400%]"
          />
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0.6, 1, 0.6],
            }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
            className="text-center z-10"
          >
            <Package className="h-6 w-6 text-gray-300 mx-auto" />
          </motion.div>
        </div>
        <Skeleton className="h-3 sm:h-4 w-3/4 bg-[#f5f5f7] rounded-full mb-2" />
        <Skeleton className="h-3 sm:h-4 w-1/2 bg-[#f5f5f7] rounded-full mb-2" />
        <div className="flex gap-1">
          {[...Array(5)].map((_, j) => (
            <Skeleton key={j} className="h-3 w-3 sm:h-3.5 sm:w-3.5 bg-[#f5f5f7] rounded-full" />
          ))}
        </div>
      </motion.div>
    ))}
  </div>
)

interface ProductGridProps {
  limit?: number
  category?: string
}

export function ProductGrid({ limit = 12, category }: ProductGridProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const fetchProducts = useCallback(
    async (pageNum = 1, append = false) => {
      try {
        if (append) {
          setLoadingMore(true)
        } else {
          setLoading(true)
        }
        setError(null)

        const data = await productService.getProducts({
          limit,
          category_slug: category,
          page: pageNum,
        })

        if (append) {
          setProducts((prev) => [...prev, ...(data || [])])
        } else {
          setProducts(data || [])
        }

        setHasMore((data || []).length >= limit)
      } catch (err) {
        console.error("Error fetching products:", err)
        setError("Failed to load products")
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [limit, category],
  )

  const handleShowMore = async () => {
    const nextPage = page + 1
    setPage(nextPage)
    await fetchProducts(nextPage, true)
  }

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  useEffect(() => {
    const handleProductImagesUpdated = (event: CustomEvent) => {
      const { productId } = event.detail
      console.log("[v0] ProductGrid: Product images updated event received for product:", productId)

      setProducts([])
      setLoading(true)
      setPage(1)

      setTimeout(() => {
        fetchProducts()
      }, 500)
    }

    window.addEventListener("productImagesUpdated", handleProductImagesUpdated as EventListener)

    return () => {
      window.removeEventListener("productImagesUpdated", handleProductImagesUpdated as EventListener)
    }
  }, [fetchProducts])

  if (loading) {
    return <ProductGridSkeleton count={limit} />
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md text-[#8B1538] text-center">
        <ShoppingBag className="h-8 w-8 mx-auto mb-2 text-[#8B1538]" />
        <p className="mb-2">{error}</p>
        <button
          onClick={() => fetchProducts()}
          className="px-4 py-2 bg-[#8B1538] text-white rounded-md hover:bg-[#6d1029] transition-colors text-sm"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (!products || products.length === 0) {
    return (
      <div className="bg-gray-50 p-8 rounded-md text-gray-500 text-center">
        <ShoppingBag className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p>No products found</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-2 gap-[1px] bg-gray-100 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {products.map((product, index) => (
          <ProductCard key={`${product.id}-${index}`} product={product} index={index} />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center py-6 bg-white">
          <button
            onClick={handleShowMore}
            disabled={loadingMore}
            className="group relative flex items-center justify-center gap-2 px-8 py-3 bg-[#8B1538] text-white font-medium rounded-full hover:bg-[#6d1029] transition-all duration-300 disabled:opacity-80 disabled:cursor-not-allowed min-w-[160px] shadow-md hover:shadow-lg"
          >
            <AnimatePresence mode="wait">
              {loadingMore ? (
                <motion.div
                  key="spinner"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center justify-center"
                >
                  <div className="relative w-6 h-6">
                    {/* Outer ring with gradient segments */}
                    <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24">
                      <defs>
                        <linearGradient id="spinnerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="white" stopOpacity="1" />
                          <stop offset="50%" stopColor="white" stopOpacity="0.5" />
                          <stop offset="100%" stopColor="white" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        fill="none"
                        stroke="url(#spinnerGradient)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeDasharray="50 15"
                      />
                    </svg>
                  </div>
                </motion.div>
              ) : (
                <motion.span
                  key="text"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  Show More
                  <motion.svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    whileHover={{ y: 2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </motion.svg>
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      )}
    </div>
  )
}
