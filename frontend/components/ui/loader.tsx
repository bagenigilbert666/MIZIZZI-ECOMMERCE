"use client"

import { motion } from "framer-motion"

interface LoaderProps {
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
  label?: string
}

export function Loader({ size = "md", showLabel = false, label = "Loading" }: LoaderProps) {
  const sizeMap = {
    sm: { container: "h-8 w-8", dot: "h-2 w-2" },
    md: { container: "h-12 w-12", dot: "h-2.5 w-2.5" },
    lg: { container: "h-16 w-16", dot: "h-3 w-3" },
  }

  const { container, dot } = sizeMap[size]

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        {/* Modern spinner with 3 animated dots */}
        <div className={`${container} flex items-center justify-center gap-1.5`}>
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className={`${dot} rounded-full bg-gradient-to-b from-primary to-blue-500`}
              animate={{
                scale: [0.8, 1.2, 0.8],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.2,
                delay: index * 0.15,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        {/* Optional label text */}
        {showLabel && (
          <motion.p
            className="text-sm font-medium text-muted-foreground text-center"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{
              duration: 1.5,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          >
            {label}
          </motion.p>
        )}
      </div>
    </div>
  )
}

/**
 * Alternative: Elegant rotating ring spinner
 */
export function LoaderRing({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeMap = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  }

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className={`relative ${sizeMap[size]}`}>
        {/* Outer rotating ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-3 border-transparent border-t-primary border-r-primary"
          animate={{ rotate: 360 }}
          transition={{
            duration: 1.2,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
        />

        {/* Middle rotating ring - opposite direction */}
        <motion.div
          className="absolute inset-2 rounded-full border-2 border-transparent border-b-blue-400 border-l-blue-400"
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
          <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-gradient-to-r from-primary to-blue-400" />
        </motion.div>
      </div>
    </div>
  )
}
