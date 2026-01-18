"use client"

import React from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import type { CarouselItem } from "@/types/carousel"

interface CarouselSlideProps {
  item: CarouselItem
  isActive: boolean
  index: number
  direction: number
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "100%" : "-100%",
    zIndex: 2,
  }),
  center: {
    x: 0,
    zIndex: 2,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? "100%" : "-100%",
    zIndex: 1,
  }),
}

export const CarouselSlide = React.memo<CarouselSlideProps>(({ item, isActive, index, direction }) => {
  const imageSrc = item.image || "/placeholder.svg"
  const isDataUrl = imageSrc.startsWith("data:")
  
  return (
    <motion.div
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{
        x: {
          type: "tween",
          duration: 0.6,
          ease: [0.25, 0.1, 0.25, 1],
        },
      }}
      className="absolute inset-0"
      style={{
        willChange: "transform",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
      }}
    >
      {/* Background Image */}
      <div className="relative h-full w-full bg-gray-100">
        {isDataUrl ? (
          <img
            src={imageSrc || "/placeholder.svg"}
            alt={item.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <Image
            src={imageSrc || "/placeholder.svg"}
            alt={item.title}
            fill
            className="object-cover"
            priority={index === 0}
            loading={index === 0 ? "eager" : "lazy"}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 1200px"
            quality={75}
          />
        )}
      </div>
    </motion.div>
  )
})

CarouselSlide.displayName = "CarouselSlide"
