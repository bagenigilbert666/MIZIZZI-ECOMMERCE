"use client"

import { motion } from "framer-motion"

interface LoaderProps {
  size?: "sm" | "md" | "lg"
  color?: string
  fullHeight?: boolean
  inline?: boolean
}

/**
 * Dark Cherry Red Spinner - Consistent loading state across admin panel
 * Matches footer management spinner style and animation
 * Color: #8B1428 (Dark Cherry Red)
 */
export function Loader({
  size = "md",
  color = "#8B1428",
  fullHeight = true,
  inline = false,
}: LoaderProps) {
  const sizeMap = {
    sm: { container: "w-12 h-12", radius: 32, strokeWidth: 4 },
    md: { container: "w-16 h-16 sm:w-20 sm:h-20", radius: 40, strokeWidth: 6 },
    lg: { container: "w-20 h-20 sm:w-24 sm:h-24", radius: 48, strokeWidth: 8 },
  }

  const config = sizeMap[size]

  return (
    <div
      className={`flex items-center justify-center ${
        fullHeight ? "py-8" : ""
      } ${inline ? "inline-flex" : ""}`}
    >
      <div className={`relative ${config.container}`}>
        <svg
          className="w-full h-full drop-shadow-lg"
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer rotating arc - Dark Cherry Red (#8B1428) */}
          <motion.circle
            cx="50"
            cy="50"
            r={config.radius}
            fill="none"
            stroke={color}
            strokeWidth={config.strokeWidth}
            strokeDasharray="62.8 188.4"
            strokeLinecap="round"
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
            style={{ transformOrigin: "50px 50px" }}
          />

          {/* Secondary accent arc - subtle glow effect */}
          <motion.circle
            cx="50"
            cy="50"
            r={config.radius}
            fill="none"
            stroke={color}
            strokeWidth={config.strokeWidth / 3}
            strokeDasharray="62.8 188.4"
            strokeLinecap="round"
            opacity={0.3}
            animate={{
              rotate: -360,
            }}
            transition={{
              duration: 3,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
            style={{ transformOrigin: "50px 50px" }}
          />
        </svg>
      </div>
    </div>
  )
}

/**
 * Spinner variant for inline usage in buttons, forms, etc.
 * Exports the same spinner but with smaller default size and no padding
 */
export function LoaderSpinner({ size = "sm", color = "#8B1428" }: Omit<LoaderProps, "fullHeight" | "inline">) {
  return <Loader size={size} color={color} fullHeight={false} inline={true} />
}



