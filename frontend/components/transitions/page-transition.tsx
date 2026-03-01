"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import AnimationErrorBoundary from "@/components/animation/animation-error-boundary"

interface PageTransitionProps {
  isVisible: boolean // This must be a boolean
  onComplete?: () => void
  onError?: () => void
  duration?: number
}

export function PageTransition({ isVisible, onComplete, onError, duration = 4000 }: PageTransitionProps) {
  const [isAnimating, setIsAnimating] = useState<boolean>(false)

  useEffect(() => {
    // Convert isVisible to boolean explicitly to ensure type safety
    const shouldAnimate = isVisible === true

    if (shouldAnimate) {
      setIsAnimating(true)
      const timer = setTimeout(() => {
        setIsAnimating(false)
        if (onComplete) onComplete()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [isVisible, onComplete, duration])

  const handleAnimationError = () => {
    console.warn("Animation error detected, gracefully handling")
    setIsAnimating(false)
    if (onError) onError()
    if (onComplete) onComplete()
  }

  return (
    <AnimationErrorBoundary>
      <AnimatePresence mode="popLayout">
        {isAnimating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black"
          >
            <div className="flex flex-col items-center gap-6">
              {/* Netflix-style spinner */}
              <motion.div
                className="relative w-24 h-24 sm:w-32 sm:h-32"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <svg
                  className="w-full h-full"
                  viewBox="0 0 100 100"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ filter: "drop-shadow(0 0 8px rgba(229, 9, 20, 0.3))" }}
                >
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#E50914"
                    strokeWidth="6"
                    strokeDasharray="70.7 282.8"
                    strokeLinecap="round"
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1.2,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "linear",
                    }}
                    style={{ transformOrigin: "50px 50px" }}
                  />
                </svg>
              </motion.div>

              {/* Text - subtle and minimal */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="text-center"
              >
                <p className="text-white text-sm sm:text-base font-medium">Loading...</p>
                <p className="text-gray-500 text-xs mt-1">Preparing your experience</p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimationErrorBoundary>
  )
}
