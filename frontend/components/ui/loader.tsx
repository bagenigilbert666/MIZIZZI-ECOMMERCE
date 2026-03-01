"use client"

import { motion } from "framer-motion"

export function Loader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="relative h-12 w-12 sm:h-16 sm:w-16">
        {/* Outer rotating ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary border-r-primary"
          animate={{ rotate: 360 }}
          transition={{
            duration: 1.2,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
        />

        {/* Middle rotating ring - opposite direction */}
        <motion.div
          className="absolute inset-2 rounded-full border-3 border-transparent border-b-blue-400 border-l-blue-400"
          animate={{ rotate: -360 }}
          transition={{
            duration: 1.8,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
        />

        {/* Inner pulsing dot */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{
            duration: 1.5,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        >
          <div className="h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-gradient-to-r from-primary to-blue-400" />
        </motion.div>
      </div>
    </div>
  )
}
