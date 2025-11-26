"use client"

import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react"
import { categoryService, type Category } from "@/services/category"
import { Loader } from "@/components/ui/loader"
import { useInView } from "react-intersection-observer"
import { websocketService } from "@/services/websocket"

const getImageUrlWithCacheBust = (url: string | undefined): string => {
  if (!url) return "/abstract-categories.png"
  // Add cache-busting timestamp if it's from our backend
  if (url.includes("localhost") || url.includes("/api/")) {
    const separator = url.includes("?") ? "&" : "?"
    return `${url}${separator}_t=${Date.now()}`
  }
  return url
}

// Optimized CategoryCard component to reduce re-renders
const CategoryCard = ({ category, index, refreshKey }: { category: Category; index: number; refreshKey: number }) => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: "200px 0px",
  })

  const imageUrl = useMemo(() => {
    const baseUrl = category.image_url || "/abstract-categories.png"
    if (baseUrl.includes("localhost") || baseUrl.includes("/api/")) {
      const separator = baseUrl.includes("?") ? "&" : "?"
      return `${baseUrl}${separator}_r=${refreshKey}`
    }
    return baseUrl
  }, [category.image_url, refreshKey])

  return (
    <Link
      href={`/category/${category.slug}`}
      key={`carousel-${category.id || index}`}
      className="flex-shrink-0 min-w-[150px] sm:min-w-[170px] md:min-w-[190px] flex-1"
      ref={ref}
    >
      <motion.div
        className="group relative overflow-hidden rounded-lg w-full h-full bg-white shadow-md transition-all duration-300"
        whileHover={{ scale: 1.05, y: -6 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        layout
      >
        {inView && (
          <>
            <div className="aspect-square w-full overflow-hidden bg-gray-100">
              <motion.img
                src={imageUrl}
                alt={category.name}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                onError={(e) => {
                  console.log(`[v0] Image load error for ${category.name}:`, category.image_url)
                  ;(e.target as HTMLImageElement).src = "/abstract-categories.png"
                }}
              />
            </div>
            <motion.div
              className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/20"
              initial={{ opacity: 0.6 }}
              whileHover={{ opacity: 0.75 }}
              transition={{ duration: 0.3 }}
            />
            <motion.div
              className="absolute bottom-0 left-0 w-full p-3"
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <h3 className="text-sm font-semibold text-white sm:text-base group-hover:text-cherry-200 transition-colors">
                {category.name}
              </h3>
              <motion.div
                className="flex items-center text-xs text-white/90 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                initial={{ x: -4 }}
                whileHover={{ x: 2 }}
              >
                <span>Shop Now</span>
                <ArrowRight className="ml-1 h-3 w-3" />
              </motion.div>
            </motion.div>
          </>
        )}
      </motion.div>
    </Link>
  )
}

export function CategoryGrid() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const carouselRef = useRef<HTMLDivElement>(null)
  const [isScrolling, setIsScrolling] = useState(false)
  const [refreshKey, setRefreshKey] = useState(Date.now())

  const handleScroll = useCallback(() => {
    if (!isScrolling) {
      setIsScrolling(true)
      requestAnimationFrame(() => {
        setIsScrolling(false)
      })
    }
  }, [isScrolling])

  const scrollCarousel = useCallback((direction: "left" | "right") => {
    if (!carouselRef.current) return

    const scrollAmount = carouselRef.current.clientWidth * 0.75
    const currentScroll = carouselRef.current.scrollLeft

    carouselRef.current.scrollTo({
      left: direction === "left" ? currentScroll - scrollAmount : currentScroll + scrollAmount,
      behavior: "smooth",
    })
  }, [])

  const fetchCategoriesFromAPI = useCallback(async (forceRefresh = false) => {
    try {
      console.log("[v0] Fetching categories, forceRefresh:", forceRefresh)

      if (forceRefresh) {
        categoryService.clearCache()
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.removeItem("categories")
        }
      }

      const data = await categoryService.getCategories({ parent_id: null }, forceRefresh)
      if (Array.isArray(data)) {
        console.log(
          `[v0] Loaded ${data.length} categories:`,
          data.map((c) => ({ name: c.name, image: c.image_url })),
        )
        setCategories(data)
        setRefreshKey(Date.now())
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.setItem("categories", JSON.stringify(data))
        }
        return data
      }
      return []
    } catch (err) {
      console.error("[v0] Error fetching categories:", err)
      throw err
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    async function initCategories() {
      try {
        setLoading(true)

        if (isMounted) {
          await fetchCategoriesFromAPI(true)
          setLoading(false)
        }
      } catch (err) {
        if (isMounted) {
          console.error("Error fetching categories:", err)
          setError("Failed to load categories")
          setLoading(false)
        }
      }
    }

    initCategories()

    return () => {
      isMounted = false
    }
  }, [fetchCategoriesFromAPI])

  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null

    const handleCategoryUpdate = async (data: any) => {
      console.log("[v0] Received category update event in grid:", data)

      // Clear all caches
      categoryService.clearCache()
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.removeItem("categories")
      }

      try {
        await fetchCategoriesFromAPI(true)
        console.log("[v0] Grid categories refreshed after admin update")
      } catch (error) {
        console.error("[v0] Failed to refresh grid categories:", error)
      }
    }

    // Subscribe to websocket events
    const unsubscribe = websocketService.on("category_updated", handleCategoryUpdate)

    const unsubscribeCreated = websocketService.on("category_created", handleCategoryUpdate)
    const unsubscribeDeleted = websocketService.on("category_deleted", handleCategoryUpdate)

    const startPolling = () => {
      if (!websocketService.getConnectionStatus()) {
        console.log("[v0] WebSocket not connected, starting polling for category updates")
        pollInterval = setInterval(async () => {
          await fetchCategoriesFromAPI(true)
        }, 30000) // Poll every 30 seconds
      }
    }

    // Start polling after a short delay to give websocket time to connect
    const pollingTimeout = setTimeout(startPolling, 5000)

    return () => {
      unsubscribe()
      unsubscribeCreated()
      unsubscribeDeleted()
      clearTimeout(pollingTimeout)
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [fetchCategoriesFromAPI])

  useEffect(() => {
    const carousel = carouselRef.current
    if (carousel) {
      carousel.addEventListener("scroll", handleScroll, { passive: true })
      return () => {
        carousel.removeEventListener("scroll", handleScroll)
      }
    }
  }, [handleScroll])

  const memoizedCategories = useMemo(() => {
    return Array.isArray(categories) ? categories : []
  }, [categories])

  if (loading && memoizedCategories.length === 0) {
    return (
      <div className="flex justify-center py-6">
        <Loader />
      </div>
    )
  }

  if (error && memoizedCategories.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="w-full overflow-hidden max-w-full">
      <div className="bg-gradient-to-r from-cherry-900 to-cherry-800 py-4 mb-4 rounded-t-lg">
        <div className="flex items-center justify-between px-4 sm:px-6">
          <h2 className="text-xl sm:text-2xl font-bold text-white">Shop By Category</h2>
          <Link
            href="/categories"
            className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm font-medium transition-colors duration-200"
          >
            <span>View All</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="relative px-2 group overflow-hidden">
        <div
          ref={carouselRef}
          className="flex overflow-x-auto scrollbar-hide gap-2 pb-3 w-full overscroll-x-contain max-w-full"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
            scrollBehavior: "smooth",
          }}
        >
          {memoizedCategories.map((category, index) => (
            <CategoryCard
              key={category.id || `category-${index}`}
              category={category}
              index={index}
              refreshKey={refreshKey}
            />
          ))}
        </div>

        <motion.button
          onClick={() => scrollCarousel("left")}
          className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 w-10 h-10 rounded-full bg-white shadow-lg items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-gray-50 hover:shadow-xl z-10"
          whileHover={{ scale: 1.1, x: -4 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-5 w-5 text-gray-800" />
        </motion.button>

        <motion.button
          onClick={() => scrollCarousel("right")}
          className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 w-10 h-10 rounded-full bg-white shadow-lg items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-gray-50 hover:shadow-xl z-10"
          whileHover={{ scale: 1.1, x: 4 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Scroll right"
        >
          <ChevronRight className="h-5 w-5 text-gray-800" />
        </motion.button>
      </div>
    </div>
  )
}
