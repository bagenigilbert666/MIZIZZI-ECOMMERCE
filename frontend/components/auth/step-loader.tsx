"use client"

import { useEffect, useState } from "react"
import { AppleSpinner } from "./apple-spinner"
import { motion, AnimatePresence } from "framer-motion"

interface StepLoaderProps {
  isLoading: boolean
  stepTitle?: string
  loadingStages?: string[]
}

export function StepLoader({ isLoading, stepTitle = "Processing", loadingStages }: StepLoaderProps) {
  const [currentStage, setCurrentStage] = useState(0)

  const defaultStages = ["Validating information...", "Securing your data...", "Almost ready..."]

  const stages = loadingStages || defaultStages

  useEffect(() => {
    if (!isLoading) {
      setCurrentStage(0)
      return
    }

    // Cycle through stages every 1.2 seconds
    const interval = setInterval(() => {
      setCurrentStage((prev) => (prev + 1) % stages.length)
    }, 1200)

    return () => clearInterval(interval)
  }, [isLoading, stages.length])

  if (!isLoading) return null

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="flex flex-col items-center gap-6 p-8"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <AppleSpinner size="lg" />

        <div className="text-center space-y-2">
          <AnimatePresence mode="wait">
            <motion.p
              key={currentStage}
              className="text-base font-medium"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {stages[currentStage]}
            </motion.p>
          </AnimatePresence>

          <motion.div
            className="flex gap-1.5 justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {stages.map((_, index) => (
              <motion.div
                key={index}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentStage ? "w-6 bg-foreground" : "w-1.5 bg-muted-foreground/30"
                }`}
                animate={{
                  scale: index === currentStage ? 1 : 0.8,
                }}
              />
            ))}
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  )
}
