"use client"

import { useRouter } from "next/navigation"

import { useRef } from "react"

import type React from "react"
import { useState, useEffect, memo } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import {
  ChevronUp,
  ChevronRight,
  Home,
  Sparkles,
  Zap,
  Grid3X3,
  Heart,
  ShoppingCart,
  Loader2,
  Tag,
  ArrowUpDown,
  Search,
  X,
} from "lucide-react"
import type { Category } from "@/services/category"
import { cn } from "@/lib/utils"
import type { Product } from "@/types"
import { useCart } from "@/contexts/cart/cart-context"
import { useToast } from "@/components/ui/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"

interface CategoryPageClientProps {
  initialCategory: Category
  initialAllCategories: Category[]
  initialProducts: Product[]
  initialSubcategories: Category[]
  initialRecommendedCategories: Category[]
  slug: string
}

/* ─── Intersection Observer hook for reveal-on-scroll ─── */
function useRevealOnScroll() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed")
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    )

    const items = el.querySelectorAll(".jumia-reveal-item")
    items.forEach((item) => observer.observe(item))

    return () => observer.disconnect()
  })

  return ref
}

/* ─── Premium Jumia-Style Product Card ─── */
const PremiumProductCard = memo(function PremiumProductCard({
  product,
  index,
}: {
  product: Product
  index: number
}) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [showSecondImg, setShowSecondImg] = useState(false)
  const [wished, setWished] = useState(false)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const { addToCart } = useCart()
  const { toast } = useToast()

  const primaryImg = product.image_urls?.[0] || product.thumbnail_url || "/generic-product-display.png"
  const secondImg = product.image_urls?.[1] || null
  
  // Calculate discount percentage and absolute savings
  const discount = product.sale_price
    ? Math.max(0, Math.round(((product.price - product.sale_price) / product.price) * 100))
    : 0
  const savingsAmount = product.sale_price
    ? Math.max(0, Math.round(product.price - product.sale_price))
    : 0

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsAddingToCart(true)
    try {
      const result = await addToCart(Number(product.id), 1)
      if (result?.success) {
        toast({
          title: "Added to Cart",
          description: `${product.name} has been added to your cart.`,
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to add product to cart. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add product to cart. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsAddingToCart(false)
    }
  }

  return (
    <motion.div
      className="jumia-reveal-item h-full"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.36, delay: (index % 12) * 0.03 }}
      style={{ animationDelay: `${(index % 12) * 0.05}s` }}
    >
      <Link
        href={`/product/${product.id}`}
        prefetch={false}
        className="block h-full"
      >
        <div
          className="jumia-card group h-full flex flex-col rounded-lg overflow-hidden bg-white border border-gray-100 transition-all duration-250 hover:shadow-md hover:border-gray-200"
          onMouseEnter={() => {
            if (secondImg) setTimeout(() => setShowSecondImg(true), 120)
          }}
          onMouseLeave={() => setShowSecondImg(false)}
        >
          {/* Image Container */}
          <div className="relative aspect-square overflow-hidden bg-gray-50">
            {/* Primary Image */}
            <Image
              src={primaryImg || "/placeholder.svg"}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className={cn(
                "object-cover transition-transform duration-250",
                showSecondImg && secondImg ? "opacity-0" : "opacity-100",
                imgLoaded && "group-hover:scale-105"
              )}
              onLoad={() => setImgLoaded(true)}
              onError={(e) => {
                const target = e.target as HTMLImageElement
                if (!target.src.includes("generic-product-display")) {
                  target.src = "/generic-product-display.png"
                }
              }}
            />

            {/* Second Image on Hover */}
            {secondImg && (
              <Image
                src={secondImg || "/placeholder.svg"}
                alt={`${product.name} alternate`}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className={cn(
                  "object-cover transition-transform duration-250 absolute inset-0",
                  showSecondImg ? "opacity-100" : "opacity-0",
                  showSecondImg ? "group-hover:scale-105" : ""
                )}
              />
            )}

            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/0 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Discount Badge */}
            {discount > 0 && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                className="absolute top-2 left-2 z-10 flex flex-col gap-1"
              >
                <div className="flex flex-col gap-1">
                  <span className="inline-flex items-center gap-0.5 bg-[#8B1538] text-white text-xs sm:text-sm font-bold px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap">
                    <Zap className="h-3.5 w-3.5 flex-shrink-0" />
                    -{discount}%
                  </span>
                  {savingsAmount > 0 && (
                    <span className="inline-block bg-emerald-600 text-white text-[9px] font-bold px-2 py-1 rounded-lg shadow-lg whitespace-nowrap">
                      Save KSh {savingsAmount.toLocaleString()}
                    </span>
                  )}
                </div>
                {discount >= 30 && (
                  <span className="inline-block bg-amber-500 text-white text-[9px] font-bold px-2 py-1 rounded-lg shadow-lg whitespace-nowrap">
                    🔥 HOT DEAL
                  </span>
                )}
              </motion.div>
            )}

            {/* Wishlist Button */}
            <motion.button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setWished(!wished)
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "absolute top-2 right-2 z-10 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full backdrop-blur-md transition-all duration-200",
                wished
                  ? "bg-[#8B1538]/90 text-white"
                  : "bg-white/80 text-gray-400 hover:text-[#8B1538]"
              )}
              aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart
                className={cn("h-4 w-4 sm:h-5 sm:w-5", wished && "fill-current")}
              />
            </motion.button>

            {/* Loading Skeleton */}
            {!imgLoaded && (
              <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-[1]">
                <div className="w-6 h-6 rounded-full border-2 border-gray-200 border-t-[#8B1538] animate-spin" />
              </div>
            )}
          </div>

          {/* Content Section */}
          <div className="flex flex-col flex-grow p-2 sm:p-2.5 space-y-1.5">
            {/* Product Name */}
            <h3 className="text-gray-800 text-xs sm:text-xs font-semibold line-clamp-2 leading-snug min-h-[1.75rem] group-hover:text-[#8B1538] transition-colors duration-200">
              {product.name}
            </h3>

            {/* Pricing */}
            <div className="space-y-1">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="font-bold text-[#8B1538] text-sm sm:text-sm leading-none">
                  KSh {(product.sale_price || product.price).toLocaleString()}
                </span>
                {product.sale_price && (
                  <span className="text-gray-400 line-through text-[10px] sm:text-[10px] leading-none">
                    KSh {product.price.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Detailed Savings Badge */}
              {discount > 0 && savingsAmount > 0 && (
                <div className="inline-flex items-center gap-2">
                  <span className="text-[10px] sm:text-[10px] text-white bg-emerald-600 font-bold px-2 py-0.5 rounded-full">
                    {discount}% OFF • Save KSh {savingsAmount.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Add to Cart Button - Prevent Link Navigation */}
            <motion.button
              onClick={handleAddToCart}
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              disabled={isAddingToCart}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full mt-2 flex items-center justify-center gap-2 px-2.5 py-2 bg-[#8B1538] text-white text-xs sm:text-sm font-bold rounded-md shadow-sm hover:shadow-md disabled:opacity-60 transition-all"
              aria-label="Add to cart"
            >
              {isAddingToCart ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4" />
                  <span>Add to Cart</span>
                </>
              )}
            </motion.button>
          </div>
        </div>
      </Link>
    </motion.div>
  )
})

/* ─── Recommended Category Card ─── */
function RecommendedCategoryCard({ category: cat }: { category: Category }) {
  const [imageLoaded, setImageLoaded] = useState(false)

  return (
    <Link href={`/category/${cat.slug}`} prefetch={false} className="block h-full">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.28 }}
        className="group h-full overflow-hidden rounded-lg bg-white border border-gray-100 transition-all duration-250 hover:shadow-md hover:border-[#8B1538]/30 hover:scale-103"
      >
        {/* Image Section */}
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
          {cat.image_url ? (
            <Image
              src={cat.image_url || "/placeholder.svg"}
              alt={cat.name}
              fill
              sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 20vw"
              className={`w-full h-full object-cover transition-transform duration-250 ${
                imageLoaded ? "opacity-100" : "opacity-0"
              } group-hover:scale-105`}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Grid3X3 className="h-5 w-5 text-gray-300" />
            </div>
          )}
          {!imageLoaded && cat.image_url && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="h-3 w-3 rounded-full border-2 border-gray-200 border-t-gray-400 animate-spin" />
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-2 space-y-1.5">
          <h3 className="line-clamp-1 text-xs font-semibold leading-tight text-gray-900 tracking-tight group-hover:text-[#8B1538] transition-colors">
            {cat.name}
          </h3>

          {/* Product count */}
          {cat.products_count && cat.products_count > 0 && (
            <div className="text-xs text-gray-500 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8B1538]" />
              {cat.products_count} {cat.products_count === 1 ? "item" : "items"}
            </div>
          )}
        </div>
      </motion.div>
    </Link>
  )
}

/* ─── Filter Chip ─── */
function FilterChip({
  label,
  active,
  onClick,
  icon,
  count,
}: {
  label: string
  active: boolean
  onClick: () => void
  icon?: React.ReactNode
  count?: number
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200",
        active
          ? "bg-[#8B1538] text-white shadow-md shadow-[#8B1538]/20"
          : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
      )}
    >
      {icon}
      {label}
      {count !== undefined && (
        <span
          className={cn(
            "ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold",
            active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}

function CategoryPageClient({
  initialCategory,
  initialAllCategories,
  initialProducts,
  initialSubcategories,
  initialRecommendedCategories,
  slug,
}: CategoryPageClientProps) {
  const router = useRouter()
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [sortBy, setSortBy] = useState("discount")
  const [searchQuery, setSearchQuery] = useState("")
  const [displayCount, setDisplayCount] = useState(24)

  // Use initial server-fetched data for instant display
  const category = initialCategory
  const products = initialProducts
  const relatedCategories = initialRecommendedCategories
  const gridRef = useRevealOnScroll()

  const INITIAL_DISPLAY = 24
  const INCREMENT = 24

  // Filter and sort products
  const filteredProducts = products
    .filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "price-asc")
        return (a.sale_price || a.price) - (b.sale_price || b.price)
      if (sortBy === "price-desc")
        return (b.sale_price || b.price) - (a.sale_price || a.price)
      if (sortBy === "discount") {
        const dA = a.sale_price ? (a.price - a.sale_price) / a.price : 0
        const dB = b.sale_price ? (b.price - b.sale_price) / b.price : 0
        return dB - dA
      }
      return 0
    })

  const displayedProducts = filteredProducts.slice(0, displayCount)
  const hasMore = filteredProducts.length > displayCount

  // Monitor scroll position for back-to-top button
  const handleScroll = () => {
    setShowBackToTop(window.scrollY > 400)
  }

  useEffect(() => {
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleShowMore = () => {
    setDisplayCount((prev) => prev + INCREMENT)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb navigation */}
      <motion.div
        className="bg-white border-b border-gray-200 sticky top-0 z-40"
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="container mx-auto px-3 sm:px-4 lg:px-8">
          <nav className="flex items-center text-xs sm:text-sm text-gray-600 py-3 overflow-x-auto">
            <Link
              href="/"
              className="flex items-center hover:text-gray-900 transition-colors whitespace-nowrap"
            >
              <Home className="h-3.5 w-3.5 mr-1" />
              <span>Home</span>
            </Link>
            <ChevronRight className="h-3.5 w-3.5 mx-2 text-gray-400 flex-shrink-0" />
            <Link
              href="/categories"
              className="hover:text-gray-900 transition-colors whitespace-nowrap"
            >
              Categories
            </Link>
            <ChevronRight className="h-3.5 w-3.5 mx-2 text-gray-400 flex-shrink-0" />
            <span className="font-medium text-gray-900 whitespace-nowrap">{category.name}</span>
          </nav>
        </div>
      </motion.div>

      <div className="container py-6 sm:py-8 px-3 sm:px-4 lg:px-8">
        {/* ── Flash Sale Header ── */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <motion.div
                  initial={{ rotate: -10, scale: 0.8 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <Zap className="h-7 w-7 sm:h-8 sm:w-8 text-[#8B1538] fill-[#8B1538]" />
                </motion.div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight text-balance">
                  {category.name}
                </h1>
              </div>
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="flex items-center justify-center px-4 py-2 rounded-full bg-[#8B1538] text-white font-bold shadow-lg"
              >
                <span className="text-sm sm:text-base">{filteredProducts.length} Items</span>
              </motion.div>
            </div>

            {/* Search & Sort Bar - Compact */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 pl-10 pr-10 w-full rounded-lg border-gray-200 bg-white shadow-sm focus:ring-2 focus:ring-[#8B1538]/20 focus:border-[#8B1538] transition-all text-sm"
                />
                {searchQuery && (
                  <motion.button
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <X className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors" />
                  </motion.button>
                )}
              </div>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-10 w-full sm:w-auto sm:min-w-[160px] text-xs sm:text-sm rounded-lg border-gray-200 bg-white shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                    <SelectValue placeholder="Sort" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="discount">Highest Discount</SelectItem>
                  <SelectItem value="price-asc">Price: Low to High</SelectItem>
                  <SelectItem value="price-desc">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>

        {/* ── Recommended Categories Section ── */}


        {/* ── Flash Sale Products Grid ── */}
        <motion.div
          className="mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {displayedProducts.length === 0 ? (
            <div className="py-16 text-center">
              <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 text-sm">
                {searchQuery
                  ? `No products found matching "${searchQuery}"`
                  : "No products available in this category"}
              </p>
            </div>
          ) : (
            <>
              <div
                ref={gridRef}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-2.5"
              >
                <AnimatePresence>
                  {displayedProducts.map((product, idx) => (
                    <PremiumProductCard
                      key={`${product.id}-${idx}`}
                      product={product}
                      index={idx}
                    />
                  ))}
                </AnimatePresence>
              </div>

              {/* Load More Button */}
              {hasMore && (
                <motion.div
                  className="mt-8 flex justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <motion.button
                    onClick={handleShowMore}
                    whileHover={{ scale: 1.05, boxShadow: "0 20px 25px -5px rgba(139, 21, 56, 0.18)" }}
                    whileTap={{ scale: 0.95 }}
                    className="px-8 py-3 bg-[#8B1538] text-white font-semibold rounded-full shadow-lg hover:bg-[#6B1028] transition-colors"
                  >
                    Load More ({filteredProducts.length - displayCount})
                  </motion.button>
                </motion.div>
              )}
            </>
          )}
        </motion.div>
      </div>

      {/* Back to top button */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="fixed bottom-8 right-8 z-40 h-12 w-12 rounded-full bg-gradient-to-r from-[#8B1538] to-[#6B1028] text-white shadow-xl flex items-center justify-center hover:shadow-2xl transition-all"
            onClick={scrollToTop}
            aria-label="Back to top"
          >
            <ChevronUp className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}

export default CategoryPageClient
