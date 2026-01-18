"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import {
  Zap,
  Crown,
  Heart,
  Package,
  HeadphonesIcon,
  Search,
  Sparkles,
  TrendingUp,
  Star,
  Gift,
  Truck,
  Shield,
  type LucideIcon,
} from "lucide-react"
import type { FeatureCard } from "@/lib/server/get-carousel-data"

const iconMap: Record<string, LucideIcon> = {
  Zap,
  Crown,
  Heart,
  Package,
  HeadphonesIcon,
  Search,
  Sparkles,
  TrendingUp,
  Star,
  Gift,
  Truck,
  Shield,
}

const DEFAULT_FEATURE_CARDS: FeatureCard[] = [
  {
    icon: "Zap",
    title: "FLASH SALES",
    description: "Limited Time Offers",
    href: "/flash-sales",
    iconBg: "bg-gradient-to-br from-amber-100 via-yellow-50 to-orange-100",
    iconColor: "text-amber-600",
    hoverBg: "hover:bg-amber-50/80",
    badge: "HOT",
  },
  {
    icon: "Crown",
    title: "LUXURY DEALS",
    description: "Premium Collections",
    href: "/luxury",
    iconBg: "bg-gradient-to-br from-violet-100 via-purple-50 to-indigo-100",
    iconColor: "text-violet-600",
    hoverBg: "hover:bg-violet-50/80",
    badge: "VIP",
  },
  {
    icon: "Heart",
    title: "WISHLIST",
    description: "Save Your Favorites",
    href: "/wishlist",
    iconBg: "bg-gradient-to-br from-rose-100 via-pink-50 to-red-100",
    iconColor: "text-rose-600",
    hoverBg: "hover:bg-rose-50/80",
  },
  {
    icon: "Package",
    title: "ORDERS",
    description: "Track Your Purchases",
    href: "/orders",
    iconBg: "bg-gradient-to-br from-sky-100 via-blue-50 to-cyan-100",
    iconColor: "text-sky-600",
    hoverBg: "hover:bg-sky-50/80",
  },
  {
    icon: "HeadphonesIcon",
    title: "SUPPORT",
    description: "24/7 Assistance",
    href: "/help",
    iconBg: "bg-gradient-to-br from-emerald-100 via-green-50 to-teal-100",
    iconColor: "text-emerald-600",
    hoverBg: "hover:bg-emerald-50/80",
  },
  {
    icon: "Search",
    title: "PRODUCTS",
    description: "Browse All Items",
    href: "/products",
    iconBg: "bg-gradient-to-br from-slate-100 via-gray-50 to-zinc-100",
    iconColor: "text-slate-600",
    hoverBg: "hover:bg-slate-50/80",
  },
]

interface FeatureCardsProps {
  cards?: FeatureCard[]
}

export const FeatureCards = React.memo(({ cards: serverCards }: FeatureCardsProps) => {
  const cards = serverCards && serverCards.length > 0 ? serverCards : DEFAULT_FEATURE_CARDS
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  return (
    <div className="grid grid-cols-2 gap-3 flex-1">
      <AnimatePresence mode="wait">
        {cards.map((card, index) => {
          const IconComponent = iconMap[card.icon] || Zap
          const isHovered = hoveredIndex === index

          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                delay: index * 0.06,
                duration: 0.4,
                ease: [0.23, 1, 0.32, 1],
              }}
              onHoverStart={() => setHoveredIndex(index)}
              onHoverEnd={() => setHoveredIndex(null)}
            >
              <Link
                href={card.href}
                className="feature-card block h-[100px] p-3 rounded-xl border border-gray-100/80 bg-gradient-to-br from-white via-white to-gray-50/50 shadow-sm hover:shadow-xl hover:shadow-cherry-500/10 hover:border-cherry-200/60 transition-all duration-500 group relative overflow-hidden"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full"
                  animate={isHovered ? { translateX: "200%" } : { translateX: "-100%" }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                />

                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-cherry-50/30 via-transparent to-cherry-100/20 rounded-xl" />

                <div className="absolute -top-6 -right-6 w-12 h-12 bg-gradient-to-br from-cherry-100/0 to-cherry-200/30 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Badge */}
                {card.badge && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: index * 0.06 + 0.2 }}
                    className="absolute -top-1 -right-1 z-20"
                  >
                    <span className="inline-flex items-center px-1.5 py-0.5 text-[8px] font-bold tracking-wider bg-gradient-to-r from-cherry-500 to-cherry-600 text-white rounded-md shadow-sm shadow-cherry-500/30">
                      {card.badge}
                    </span>
                  </motion.div>
                )}

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center justify-center text-center h-full gap-2">
                  <motion.div
                    className={`${card.iconBg} p-2 rounded-lg transition-all duration-500 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-cherry-500/20 relative overflow-hidden`}
                    whileHover={{ rotate: [0, -5, 5, 0] }}
                    transition={{ duration: 0.5 }}
                  >
                    {/* Icon inner glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <IconComponent
                      className={`h-4 w-4 ${card.iconColor} transition-all duration-500 group-hover:text-cherry-600 relative z-10`}
                    />
                  </motion.div>

                  {/* Text content */}
                  <div className="space-y-0.5">
                    <h3 className="text-[11px] font-bold text-gray-800 uppercase tracking-wider leading-tight transition-colors duration-300 group-hover:text-cherry-700">
                      {card.title}
                    </h3>
                    <p className="text-[10px] text-gray-500 leading-tight line-clamp-1 transition-colors duration-300 group-hover:text-cherry-600/80 font-medium">
                      {card.description}
                    </p>
                  </div>

                  <motion.div
                    className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    initial={{ x: -5, opacity: 0 }}
                    animate={isHovered ? { x: 0, opacity: 1 } : { x: -5, opacity: 0 }}
                  >
                    <div className="w-4 h-4 rounded-full bg-cherry-100 flex items-center justify-center">
                      <svg className="w-2 h-2 text-cherry-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </motion.div>
                </div>

                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cherry-400 to-transparent"
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={isHovered ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                />
              </Link>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
})

FeatureCards.displayName = "FeatureCards"
