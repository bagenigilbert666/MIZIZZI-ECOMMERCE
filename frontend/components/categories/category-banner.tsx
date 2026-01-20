"use client"

import { motion } from "framer-motion"
import { Grid3X3, ArrowRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export function CategoryBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-900 to-neutral-800 shadow-lg"
    >
      <div className="relative h-[200px] sm:h-[280px] md:h-[320px] w-full">
        {/* Background Image */}
        <Image
          src="https://images.unsplash.com/photo-1556906781-9a412961c28c?w=1600&h=320&fit=crop&q=80"
          alt="Shop by Categories"
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />

        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-8 md:p-10">
          <div>
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-white/20 w-fit"
            >
              <Grid3X3 className="h-4 w-4 text-white" />
              <span className="text-xs sm:text-sm font-semibold text-white tracking-wide uppercase">Categories</span>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col gap-4"
          >
            <div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2 sm:mb-3 tracking-tight text-balance">
                Shop by Categories
              </h2>
              <p className="text-sm sm:text-base text-white/85 max-w-lg">
                Explore our wide range of premium collections curated just for you
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/categories"
                className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-neutral-900 px-6 sm:px-8 py-2.5 sm:py-3 rounded-full font-semibold text-sm sm:text-base transition-all duration-300 hover:shadow-xl hover:scale-105 active:scale-95"
              >
                <span>Browse All</span>
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Decorative accent - subtle animated element */}
        <motion.div
          className="absolute top-4 right-4 w-20 h-20 sm:w-32 sm:h-32 bg-white/10 rounded-full blur-2xl"
          animate={{ y: [0, 10, 0], x: [0, 5, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </motion.div>
  )
}
