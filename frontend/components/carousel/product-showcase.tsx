"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Gem, Shirt, Watch, Crown, Award, Timer, TrendingUp, Users, type LucideIcon } from "lucide-react"

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

interface ProductShowcaseProps {
  categories?: ProductCategory[]
}

export const ProductShowcase = React.memo(({ categories: serverCategories }: ProductShowcaseProps) => {
  const [categories] = useState<ProductCategory[]>(() => {
    if (serverCategories && serverCategories.length > 0) {
      return serverCategories
    }
    // Default fallback for instant display
    return [
      {
        id: 1,
        title: "NEW ARRIVALS",
        metric: "50+",
        description: "Premium quality products",
        icon_name: "Gem",
        image: "/new-arrivals-fashion.png",
        gradient: "from-rose-500 to-pink-600",
        features: ["Latest Trends", "Premium Quality", "Exclusive Designs", "Limited Edition"],
        is_active: true,
      },
      {
        id: 2,
        title: "BEST SELLERS",
        metric: "98.7%",
        description: "Customer satisfaction rate",
        icon_name: "Award",
        image: "/best-seller-products.jpg",
        gradient: "from-amber-500 to-orange-600",
        features: ["Top Rated", "Most Popular", "Customer Favorites", "Priority Support"],
        is_active: true,
      },
    ]
  })
  const [currentCategory, setCurrentCategory] = useState(0)

  // Auto-rotate categories
  useEffect(() => {
    if (categories.length === 0) return
    const interval = setInterval(() => {
      setCurrentCategory((prev) => (prev + 1) % categories.length)
    }, 10000)
    return () => clearInterval(interval)
  }, [categories.length])

  const category = categories[currentCategory]
  const IconComponent = iconMap[category?.icon_name] || iconMap.Gem
  const displayFeatures = category?.features?.slice(0, 4) || []

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
              loading="eager"
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
