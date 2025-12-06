"use client"
import { useState, useEffect, useCallback, memo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { productService } from "@/services/product"
import { ShoppingBag, Star, Package } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import type { Product as BaseProduct } from "@/types"

type Product = BaseProduct & { color_options?: string[]; stock?: number; rating?: number; reviews_count?: number }

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
            className={`h-3 w-3 ${
              star <= Math.floor(rating)
                ? "fill-yellow-400 text-yellow-400"
                : star - 0.5 <= rating
                  ? "fill-yellow-400/50 text-yellow-400"
                  : "fill-gray-200 text-gray-200"
            }`}
          />
        ))}
      </div>
      {reviewCount > 0 && <span className="text-[10px] text-gray-400">({reviewCount.toLocaleString()})</span>}
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

  // Generate random rating and reviews for demo
  const rating = product.rating || 3 + Math.random() * 2
  const reviewCount = product.reviews_count || Math.floor(Math.random() * 5000) + 100

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
          {/* Image Container - Square aspect ratio */}
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
                sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, 16vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            </motion.div>

            {/* Discount Badge */}
            {product.sale_price && discountPercentage > 0 && (
              <div className="absolute top-1 left-1 bg-[#f85606] text-white text-[10px] font-medium px-1.5 py-0.5 rounded-sm z-20">
                -{discountPercentage}%
              </div>
            )}
          </div>

          {/* Product Info - Compact */}
          <div className="p-2">
            {/* Product Name - 2 lines max */}
            <h3 className="text-xs text-gray-800 line-clamp-2 leading-tight mb-1.5 min-h-[32px]">{product.name}</h3>

            {/* Price - Red like Kilimall */}
            <div className="mb-1">
              <span className="text-sm font-semibold text-[#f85606]">
                KSh {(product.sale_price || product.price).toLocaleString()}
              </span>
              {product.sale_price && (
                <span className="text-[10px] text-gray-400 line-through ml-1">
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
  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 border-l border-t border-gray-100">
    {[...Array(count)].map((_, i) => (
      <div key={i} className="bg-white border-b border-r border-gray-100">
        <div className="aspect-square bg-gray-100 animate-pulse" />
        <div className="p-2 space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
    ))}
  </div>
)

interface ProductGridProps {
  categorySlug?: string
  limit?: number
}

export function ProductGrid({ categorySlug, limit = 18 }: ProductGridProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const ITEMS_PER_PAGE = 18 // 3 rows of 6 items

  // Fetch products
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      let fetched: Product[] = []
      if (categorySlug) {
        fetched = await productService.getProductsByCategory(categorySlug)
      } else {
        fetched = await productService.getProducts({ limit: 100 }) // Fetch more initially
      }

      const unique = fetched.filter((p, i, arr) => i === arr.findIndex((x) => x.id === p.id))
      setProducts(unique)
      setDisplayedProducts(unique.slice(0, ITEMS_PER_PAGE))
      setHasMore(unique.length > ITEMS_PER_PAGE)
      setPage(1)
    } catch (e) {
      console.error("Error fetching products:", e)
      setError("Failed to load products")
    } finally {
      setLoading(false)
    }
  }, [categorySlug])

  const handleShowMore = useCallback(async () => {
    if (loadingMore) return

    setLoadingMore(true)

    // Simulate loading delay for better UX
    await new Promise((resolve) => setTimeout(resolve, 300))

    const nextPage = page + 1
    const startIndex = 0
    const endIndex = nextPage * ITEMS_PER_PAGE

    if (endIndex >= products.length) {
      // Need to fetch more from API
      try {
        const more = await productService.getProducts({
          page: nextPage,
          limit: ITEMS_PER_PAGE,
          category_slug: categorySlug,
        })

        if (!more.length) {
          setHasMore(false)
        } else {
          const combined = [...products, ...more]
          const unique = combined.filter((p, i, arr) => i === arr.findIndex((x) => x.id === p.id))
          setProducts(unique)
          setDisplayedProducts(unique.slice(0, endIndex))
          setPage(nextPage)
          setHasMore(more.length >= ITEMS_PER_PAGE)
        }
      } catch (e) {
        console.error("Error loading more products:", e)
      }
    } else {
      // Show more from already fetched products
      setDisplayedProducts(products.slice(startIndex, endIndex))
      setPage(nextPage)
      setHasMore(endIndex < products.length)
    }

    setLoadingMore(false)
  }, [categorySlug, loadingMore, page, products])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  if (loading) return <ProductGridSkeleton count={18} />

  if (error) {
    return (
      <div className="w-full p-8 text-center">
        <div className="mx-auto mb-4 h-16 w-16 text-[#f85606]">
          <ShoppingBag className="h-full w-full" />
        </div>
        <h3 className="mb-1 text-lg font-medium text-gray-900">Oops! Something went wrong</h3>
        <p className="mb-4 text-gray-500">{error}</p>
        <button
          onClick={fetchProducts}
          className="rounded-md bg-[#f85606] px-4 py-2 text-white transition-colors hover:bg-[#e64d00]"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (!products.length) {
    return (
      <div className="w-full py-12 text-center">
        <div className="mx-auto mb-4 h-16 w-16 text-gray-300">
          <ShoppingBag className="h-full w-full" />
        </div>
        <h3 className="mb-1 text-lg font-semibold text-gray-900">No products found</h3>
        <p className="text-gray-500">We couldn&apos;t find any products in this category.</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-orange-100">
            <Package className="h-3.5 w-3.5 text-[#f85606]" />
          </div>
          <h2 className="text-base font-semibold text-gray-900">All Products</h2>
          <span className="text-xs text-gray-500">({products.length} items)</span>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 border-l border-t border-gray-100">
        {displayedProducts.map((product, index) => (
          <ProductCard key={product.id} product={product} index={index} />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-6 mb-4">
          <button
            onClick={handleShowMore}
            disabled={loadingMore}
            className="px-12 py-2.5 border border-gray-300 rounded-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMore ? (
              <span className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                  className="h-4 w-4 border-2 border-gray-300 border-t-[#f85606] rounded-full"
                />
                Loading...
              </span>
            ) : (
              "SHOW MORE"
            )}
          </button>
        </div>
      )}

      {/* End message when no more products */}
      {!hasMore && displayedProducts.length > 0 && (
        <div className="text-center py-4 text-sm text-gray-400">You&apos;ve seen all {products.length} products</div>
      )}
    </div>
  )
}

export default ProductGrid
