"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Gem, Shirt, Watch, Crown, Award, Timer, TrendingUp, Users, Package, type LucideIcon } from "lucide-react"

const iconMap: Record<string, LucideIcon> = {
  Gem,
  Shirt,
  Watch,
  Crown,
  Award,
  Timer,
  TrendingUp,
  Users,
}

interface ProductCategory {
  id: number
  title: string
  metric: string
  description: string
  icon_name: string
  image: string
  gradient: string
  features: string[]
  is_active: boolean
}

const STORAGE_KEY = "mizizzi_product_showcase_cache"
const STORAGE_EXPIRY_KEY = "mizizzi_product_showcase_cache_expiry"
const CACHE_DURATION = 24 * 60 * 60 * 1000

const getCachedData = (): ProductCategory[] | null => {
  if (typeof window === "undefined") return null
  try {
    const expiry = localStorage.getItem(STORAGE_EXPIRY_KEY)
    if (expiry && Date.now() > Number.parseInt(expiry, 10)) {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(STORAGE_EXPIRY_KEY)
      return null
    }
    const cached = localStorage.getItem(STORAGE_KEY)
    return cached ? JSON.parse(cached) : null
  } catch {
    return null
  }
}

const setCachedData = (items: ProductCategory[]) => {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    localStorage.setItem(STORAGE_EXPIRY_KEY, String(Date.now() + CACHE_DURATION))
  } catch {}
}

const ProductShowcaseSkeleton = () => (
  <section
    className="h-full w-full max-w-md md:max-w-lg mx-auto rounded-2xl overflow-hidden shadow-lg bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-200 relative"
    aria-label="Loading product showcase"
  >
    {/* Animated shimmer overlay */}
    <div className="absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent"
        animate={{ translateX: ["100%", "-100%"] }}
        transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
      />
    </div>

    <div className="relative z-10 h-full p-5 md:p-7 flex flex-col justify-between">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/30 animate-pulse">
          <Package className="h-6 w-6 text-primary/50" />
        </div>
        <div className="h-4 w-32 bg-gray-300 rounded animate-pulse" />
      </div>

      {/* Metric skeleton */}
      <div className="mb-3">
        <div className="h-8 w-24 bg-gray-300 rounded mb-2 animate-pulse" />
        <div className="h-3 w-40 bg-gray-300/70 rounded animate-pulse" />
      </div>

      {/* Features skeleton */}
      <div className="space-y-2 mt-2">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="flex items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="w-2 h-2 rounded-full bg-primary/30 animate-pulse" />
            <div className="h-3 bg-gray-300/70 rounded animate-pulse" style={{ width: `${60 + i * 10}%` }} />
          </motion.div>
        ))}
      </div>

      {/* Brand text */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
        <p className="text-xs text-gray-400 font-medium">Loading products...</p>
      </div>
    </div>

    {/* Dots skeleton */}
    <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-1.5 z-20">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={`h-0.5 rounded-full bg-gray-400/30 ${i === 0 ? "w-8" : "w-2"}`} />
      ))}
    </div>
  </section>
)

export const ProductShowcase = React.memo(() => {
  const [categories, setCategories] = useState<ProductCategory[] | null>(() => {
    if (typeof window === "undefined") return null
    return getCachedData()
  })
  const [currentCategory, setCurrentCategory] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check cache on mount (for SSR hydration)
    const cached = getCachedData()
    if (cached) {
      setCategories(cached)
      setIsLoading(false)
    }

    const fetchCategories = async () => {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://mizizzi-ecommerce-1.onrender.com"
        const response = await fetch(`${API_BASE_URL}/api/panels/items?panel_type=product_showcase&position=left`)

        if (response.ok) {
          const data = await response.json()
          if (data.items && data.items.length > 0) {
            const mappedItems = data.items.map((item: any) => ({
              id: item.id,
              title: item.title,
              metric: item.metric,
              description: item.description,
              icon_name: item.icon_name,
              image: item.image_url,
              gradient: item.gradient,
              features: item.features,
              is_active: item.is_active,
            }))
            setCategories(mappedItems)
            setCachedData(mappedItems)
          }
        }
      } catch {
        // Silent fail
      } finally {
        setIsLoading(false)
      }
    }

    fetchCategories()
  }, [])

  useEffect(() => {
    if (!categories || categories.length === 0) return
    const interval = setInterval(() => {
      setCurrentCategory((prev) => (prev + 1) % categories.length)
    }, 10000)
    return () => clearInterval(interval)
  }, [categories])

  if (isLoading || !categories || categories.length === 0) {
    return <ProductShowcaseSkeleton />
  }

  const category = categories[currentCategory]
  const IconComponent = iconMap[category?.icon_name] || iconMap.Gem

  const displayFeatures = category?.features?.slice(0, 4) || []

  if (!category) return <ProductShowcaseSkeleton />

  return (
    <section
      className="h-full w-full max-w-md md:max-w-lg mx-auto rounded-2xl overflow-hidden shadow-lg bg-white/80 backdrop-blur-md border border-gray-100 relative"
      aria-label="Product showcase"
    >
      <div className="absolute inset-0 rounded-2xl overflow-hidden">
        {categories.map((cat, index) => (
          <motion.div
            key={cat.id}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{
              opacity: index === currentCategory ? 1 : 0,
              scale: index === currentCategory ? 1 : 1.05,
            }}
            transition={{ duration: 4, ease: [0.16, 1, 0.3, 1] }}
          >
            <img
              src={cat.image || "/placeholder.svg"}
              alt={cat.title}
              className="w-full h-full object-cover object-center"
              style={{ filter: "brightness(1.1) contrast(1.15) saturate(1.1)" }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-black/40 to-black/50" />
          </motion.div>
        ))}
      </div>

      <div className="relative z-10 h-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentCategory}
            initial={{ opacity: 0, y: 30, filter: "blur(10px)", scale: 0.95 }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)", scale: 1 }}
            exit={{ opacity: 0, y: -30, filter: "blur(10px)", scale: 1.05 }}
            transition={{ duration: 2.5, ease: [0.16, 1, 0.3, 1] }}
            className="h-full p-5 md:p-7 flex flex-col justify-between"
          >
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className={`absolute w-1 h-1 rounded-full bg-gradient-to-r ${category.gradient} opacity-30`}
                  style={{ left: `${20 + i * 15}%`, top: `${10 + i * 12}%` }}
                  animate={{
                    y: [-10, 10, -10],
                    x: [-5, 5, -5],
                    opacity: [0.2, 0.6, 0.2],
                    scale: [0.8, 1.2, 0.8],
                  }}
                  transition={{
                    duration: 4 + i * 0.5,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                    delay: i * 0.3,
                  }}
                />
              ))}
            </div>

            <motion.div
              className="flex items-center gap-3 mb-4"
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.div
                className={`p-3 rounded-xl bg-gradient-to-br ${category.gradient} shadow-xl backdrop-blur-sm`}
                animate={{
                  scale: [1, 1.05, 1],
                  rotate: [0, 2, -2, 0],
                }}
                transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
              >
                <IconComponent className="h-6 w-6 text-white drop-shadow-lg" />
              </motion.div>
              <h3 className="text-sm md:text-base font-extrabold font-serif text-white uppercase tracking-wider drop-shadow-lg">
                {category.title}
              </h3>
            </motion.div>

            <motion.div
              className="mb-3"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="text-2xl md:text-3xl font-black font-serif text-white mb-1 drop-shadow-xl">
                {category.metric}
              </div>
              <p className="text-xs md:text-sm text-white opacity-95 font-medium font-serif drop-shadow-md">
                {category.description}
              </p>
            </motion.div>

            <motion.div
              className="relative"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="space-y-2 mt-2">
                {displayFeatures.map((feature, index) => (
                  <motion.div
                    key={feature}
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.2 + index * 0.15, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <motion.div
                      className={`w-2 h-2 rounded-full bg-gradient-to-r ${category.gradient} shadow-lg`}
                      animate={{ scale: [1, 1.4, 1], opacity: [0.8, 1, 0.8] }}
                      transition={{
                        duration: 3,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut",
                        delay: index * 0.4,
                      }}
                    />
                    <span className="text-xs md:text-sm text-white opacity-95 font-semibold font-serif drop-shadow-md">
                      {feature}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              className={`absolute top-4 right-4 w-4 h-4 rounded-full bg-gradient-to-r ${category.gradient} opacity-60`}
              animate={{
                scale: [1, 1.8, 1],
                opacity: [0.4, 0.8, 0.4],
                rotate: [0, 180, 360],
              }}
              transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-1.5 z-20">
        {categories.map((_, index) => (
          <motion.div
            key={index}
            className={`h-0.5 rounded-full transition-all duration-1000 ${
              index === currentCategory ? `w-8 bg-gradient-to-r ${category.gradient}` : "w-2 bg-white/30"
            }`}
            animate={{ opacity: index === currentCategory ? 1 : 0.5 }}
            transition={{ duration: 1 }}
          />
        ))}
      </div>
    </section>
  )
})

ProductShowcase.displayName = "ProductShowcase"
