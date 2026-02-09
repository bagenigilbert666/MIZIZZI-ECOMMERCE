"use client"

import React, { useState, useMemo, useCallback, useEffect, useRef, memo } from "react"
import { useRouter } from "next/navigation"
import { Search, X, Grid3X3, ChevronDown, TrendingUp } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import type { Category } from "@/lib/server/get-categories"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CategoriesBannerCarousel } from "@/components/categories/banner-carousel"
import { cn } from "@/lib/utils"
import { cloudinaryService } from "@/services/cloudinary-service"

interface CategoriesPageContentProps {
  categories: Category[]
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

const LogoPlaceholder = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-white">
    <div className="relative h-8 w-8 sm:h-10 sm:w-10">
      <Image
        src="/images/screenshot-20from-202025-02-18-2013-30-22.png"
        alt="Loading"
        fill
        className="object-contain"
        priority
      />
    </div>
  </div>
)

const CategoryCard = memo(
  ({
    category,
    index,
    onClick,
  }: {
    category: Category
    index: number
    onClick: (category: Category) => void
  }) => {
    const [imgLoaded, setImgLoaded] = useState(false)
    const [imageError, setImageError] = useState(false)

    const handleImageLoad = useCallback(() => {
      setImgLoaded(true)
    }, [])

    const handleImageError = useCallback(() => {
      setImageError(true)
    }, [])

    // Get optimized image URL using Cloudinary (like flash-sales) - FAST MODE
    const getOptimizedImageUrl = (): string => {
      if (!category.image_url) return ""
      
      // If already a full URL, return immediately for fast rendering
      if (category.image_url.startsWith("http") || category.image_url.startsWith("/")) {
        return category.image_url
      }
      
      // Use Cloudinary optimization for ultra-fast loading (smaller size to reduce card footprint)
      return cloudinaryService.generateOptimizedUrl(category.image_url, {
        width: 260,
        height: 260,
        crop: "fill",
        quality: "auto",
        format: "auto",
        gravity: "auto",
      })
    }

    const imageUrl = getOptimizedImageUrl()
    const hasValidImage = imageUrl && imageUrl.length > 0

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.15, delay: Math.min(index * 0.005, 0.1) }}
        onClick={() => onClick(category)}
        className="group h-full cursor-pointer overflow-hidden rounded-md bg-white border border-gray-100 hover:shadow-sm hover:border-gray-200 transition-all duration-200"
      >
        {/* Image Section */}
  <div className="relative aspect-[5/4] overflow-hidden bg-gray-50">
          {/* Placeholder while loading */}
          <AnimatePresence>
            {(imageError || !imgLoaded) && (
              <motion.div
                initial={{ opacity: 1 }}
                exit={{
                  opacity: 0,
                  scale: 1.1,
                  transition: { duration: 0.3, ease: "easeInOut" },
                }}
                className="absolute inset-0 z-10 flex items-center justify-center bg-white"
              >
                <LogoPlaceholder />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main image - FAST NATIVE IMG TAG (like flash-sales) */}
          {hasValidImage && (
            <img
              src={imageUrl || "/placeholder.svg"}
              alt={category.name}
              className={`w-full h-full object-cover group-hover:scale-105 transition-transform will-change-transform ${
                imgLoaded ? "opacity-100" : "opacity-0"
              }`}
              style={{ willChange: "transform", transformOrigin: "center" }}
              loading={index < 12 ? "eager" : "lazy"}
              decoding={index < 12 ? "sync" : "async"}
              fetchPriority={index < 12 ? "high" : "auto"}
              onLoad={handleImageLoad}
              onError={handleImageError}
              crossOrigin="anonymous"
            />
          )}

          {/* Real products count badge - shows actual database count */}
            {category.product_count !== undefined && category.product_count > 0 && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              className="absolute top-2 left-2 inline-flex items-center gap-0.5 bg-[#8B1538] text-white text-[7px] sm:text-[8px] font-bold px-1 py-0.5 rounded-full shadow-md"
            >
              <TrendingUp className="h-1.5 w-1.5" />
              <span>{category.product_count}</span>
            </motion.div>
          )}

          {/* View button on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/8">
            <button className="flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-[#8B1538] text-white text-[8.5px] sm:text-[9px] font-semibold rounded-full shadow-md hover:bg-[#6B1028]">
              <ChevronDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              <span>Explore</span>
            </button>
          </div>
        </div>

  {/* Content Section */}
  <div className="flex flex-col flex-grow p-1 sm:p-1.5 md:p-2 space-y-0.5">
          {/* Category name - Primary */}
          <h3 className="text-gray-800 text-xs sm:text-xs font-semibold line-clamp-2 leading-snug min-h-[1.5rem] group-hover:text-[#8B1538] transition-colors duration-200">
            {category.name}
          </h3>

          {/* Product count - Prominent display */}
          {category.product_count !== undefined && (
            <div className="flex items-baseline gap-1 pt-0.5">
              <span className={`font-bold text-[13px] sm:text-[14px] leading-none ${
                category.product_count > 0 ? "text-[#8B1538]" : "text-gray-400"
              }`}>
                {category.product_count}
              </span>
              <span className="text-gray-400 text-[10px] sm:text-[10px]">
                {category.product_count === 1 ? "Product" : "Products"}
              </span>
            </div>
          )}

          {/* Description */}
          {category.description && (
            <p className="text-[9px] sm:text-[9px] text-gray-500 line-clamp-1 mt-auto">
              {category.description}
            </p>
          )}
        </div>
      </motion.div>
    )
  }
)

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

export function CategoriesPageContent({
  categories: initialCategories,
}: CategoriesPageContentProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("name")
  const [activeFilter, setActiveFilter] = useState("all")
  const [visibleRows, setVisibleRows] = useState(4) // Start with 4 rows

  // Reveal ref
  const gridRef = useRevealOnScroll()

  // Calculate items per row based on screen size
  // mobile: 2, small: 3, medium: 4, large+: 5
  const itemsPerRow = 5 // lg/xl:grid-cols-5
  const visibleItems = visibleRows * itemsPerRow

  const filteredCategories = useMemo(() => {
    let result = [...initialCategories]

    // Search filter
    if (searchQuery) {
      result = result.filter(
        (category) =>
          category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (category.description &&
            category.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // Category filter
    if (activeFilter === "popular") {
      result = result.filter((c) => (c.product_count || 0) > 0)
      result.sort((a, b) => (b.product_count || 0) - (a.product_count || 0))
    }

    // Sort
    if (activeFilter !== "popular") {
      result.sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name)
        if (sortBy === "products")
          return (b.product_count || 0) - (a.product_count || 0)
        return 0
      })
    }

    return result
  }, [initialCategories, searchQuery, sortBy, activeFilter])

  const handleCategoryClick = useCallback(
    (category: Category) => {
      router.push(`/category/${category.slug}`)
    },
    [router]
  )

  if (!initialCategories || initialCategories.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Categories
            </h1>
            <Grid3X3 className="h-6 w-6 text-[#8B1538]" />
          </div>
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
            <Grid3X3 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 text-sm">
              No categories available at the moment.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
      <div className="container py-4 sm:py-6 px-3 sm:px-4 lg:px-8">
        {/* ── Page Header ── */}
        <div className="mb-5 sm:mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight text-balance">
                All Categories
              </h1>
              <div className="jumia-count-badge flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#8B1538] text-white text-xs sm:text-sm font-bold">
                {filteredCategories.length > 99
                  ? "99+"
                  : filteredCategories.length}
              </div>
            </div>
            <p className="text-xs sm:text-sm text-gray-500">
              Browse amazing product categories
            </p>
          {/* Search */}
          <div className="relative w-full sm:w-auto sm:min-w-[280px] lg:min-w-[320px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 pl-10 pr-10 w-full rounded-xl border-gray-200 bg-white shadow-sm focus:ring-2 focus:ring-[#8B1538]/20 focus:border-[#8B1538] transition-all"
            />
            {searchQuery && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors" />
              </button>
            )}
          </div>
        </div>
      </div>

        {/* ── Premium Banner ── */}
        <CategoriesBannerCarousel />

        {/* ── Filter Chips + Sort Bar ── */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Filter chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <FilterChip
              label="All"
              active={activeFilter === "all"}
              onClick={() => setActiveFilter("all")}
              icon={<Grid3X3 className="h-3.5 w-3.5" />}
              count={initialCategories.length}
            />
            <FilterChip
              label="Popular"
              active={activeFilter === "popular"}
              onClick={() => setActiveFilter("popular")}
              icon={<TrendingUp className="h-3.5 w-3.5" />}
              count={initialCategories.filter((c) => (c.product_count || 0) > 0).length}
            />
          </div>

          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-9 w-[170px] text-xs sm:text-sm rounded-xl border-gray-200 bg-white shadow-sm">
              <div className="flex items-center gap-1.5">
                <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                <SelectValue placeholder="Sort by" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name (A-Z)</SelectItem>
              <SelectItem value="products">Most Products</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ── Categories Grid ── */}
        {filteredCategories.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100"
          >
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Grid3X3 className="h-8 w-8 text-gray-300" />
            </div>
            <p className="text-gray-600 mb-4">
              {searchQuery
                ? "No categories match your search."
                : "No categories available."}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-sm text-gray-900 font-medium hover:text-[#8B1538] transition-colors"
              >
                Clear search
              </button>
            )}
          </motion.div>
        ) : (
          <div className="flex flex-col gap-4">
            <div ref={gridRef} className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5">
              <AnimatePresence mode="popLayout">
                {filteredCategories.slice(0, visibleItems).map((category, index) => (
                  <CategoryCard
                    key={category.id}
                    category={category}
                    index={index}
                    onClick={handleCategoryClick}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Show More Button */}
            {visibleItems < filteredCategories.length && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex justify-center pt-2"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setVisibleRows(visibleRows + 3)}
                  className="px-8 py-3 sm:py-3.5 bg-[#8B1538] text-white font-semibold text-sm sm:text-base rounded-xl hover:bg-[#6B1028] shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                >
                  <span>Show More</span>
                  <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5" />
                </motion.button>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
