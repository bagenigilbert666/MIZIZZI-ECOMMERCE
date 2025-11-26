"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"

interface SlideData {
  id: number
  subtitle: string
  image: string
  gradient: string
  accent_color: string // Note: API returns snake_case
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

export const ContactCTA = React.memo(() => {
  const [slides, setSlides] = useState<SlideData[]>([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [direction, setDirection] = useState(1)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchSlides = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/contact-cta/slides`)
        if (response.ok) {
          const data = await response.json()
          if (data.slides && data.slides.length > 0) {
            setSlides(data.slides)
          }
        }
      } catch (error) {
        console.error("Failed to fetch CTA slides:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSlides()
  }, [])

  useEffect(() => {
    if (slides.length === 0) return

    const interval = setInterval(() => {
      setDirection(1)
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [slides.length])

  if (isLoading || slides.length === 0) return null

  const currentPromo = slides[currentSlide]

  const slideVariants = {
    enter: (direction: number) => ({
      opacity: 0,
      scale: 1.02,
    }),
    center: {
      zIndex: 1,
      opacity: 1,
      scale: 1,
      transition: {
        duration: 1.2,
        ease: [0.25, 0.1, 0.25, 1.0], // Smooth cubic-bezier
      },
    },
    exit: (direction: number) => ({
      zIndex: 0,
      opacity: 0,
      scale: 0.98,
      transition: {
        duration: 1.2,
        ease: [0.25, 0.1, 0.25, 1.0],
      },
    }),
  }

  const contentVariants = {
    hidden: { y: 10, opacity: 0 }, // Reduced movement further for subtle effect
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: "easeOut",
      },
    },
  }

  return (
    <section
      className="relative h-[160px] sm:h-[180px] md:h-[200px] rounded-2xl overflow-hidden shadow-2xl" // Reduced height for cleaner, compact look
      aria-label="Promotional carousel"
    >
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={currentSlide}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className="absolute inset-0"
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${currentPromo.gradient}`}>
            <div className="absolute inset-0 bg-black/10" /> {/* Lighter overlay */}
          </div>

          <div className="absolute right-0 top-0 bottom-0 w-[60%] md:w-[65%]">
            {" "}
            <motion.div
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="relative h-full"
            >
              <Image
                src={currentPromo.image || "/placeholder.svg"}
                alt={currentPromo.subtitle}
                fill
                className="object-cover object-center"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-black/80" />{" "}
              {/* Stronger gradient for text readability */}
            </motion.div>
          </div>

          <div className="relative h-full flex items-center px-6 sm:px-8 z-10">
            <div className="max-w-[50%]">
              <motion.div variants={contentVariants} initial="hidden" animate="visible" className="space-y-1">
                <p
                  className={`text-xl sm:text-2xl md:text-3xl font-bold ${currentPromo.accent_color} drop-shadow-lg leading-tight`}
                >
                  {currentPromo.subtitle}
                </p>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  )
})

ContactCTA.displayName = "ContactCTA"
