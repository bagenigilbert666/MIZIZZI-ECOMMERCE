"use client"

import { motion, AnimatePresence } from "framer-motion"
import { LogoLoader } from "./logo-loader"
import { useState, useEffect } from "react"

interface AuthContainerLoaderProps {
  isLoading: boolean
  message?: string
}

/**
 * Loading steps to show progression during auth operations
 */
const LOADING_STEPS = ["Initializing...", "Setting up your account...", "Verifying information...", "Almost ready..."]

/**
 * A compact loader that fits inside auth containers with stepped messages
 * Shows logo spinner with progressive loading messages without full-screen overlay
 */
export function AuthContainerLoader({ isLoading, message }: AuthContainerLoaderProps) {
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    if (!isLoading) {
      setCurrentStep(0)
      return
    }

    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % LOADING_STEPS.length)
    }, 2000) // Change step every 2 seconds

    return () => clearInterval(interval)
  }, [isLoading])

  const displayMessage = message || LOADING_STEPS[currentStep]

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="w-full py-4 flex flex-col items-center justify-center gap-3"
        >
          <LogoLoader size="sm" />
          <motion.p
            className="text-xs text-muted-foreground text-center"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
            key={displayMessage}
          >
            {displayMessage}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
