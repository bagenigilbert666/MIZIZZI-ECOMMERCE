"use client"

import { motion } from "framer-motion"

export function Loader() {
  return (
    <div className="flex items-center justify-center py-8">
      {/* Netflix-style rotating crescent - transparent, no background */}
      <div className="relative w-16 h-16 sm:w-20 sm:h-20">
        <svg
          className="w-full h-full"
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
        >
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#E50914"
            strokeWidth="8"
            strokeDasharray="70.7 282.8"
            strokeLinecap="round"
            animate={{ rotate: 360 }}
            transition={{
              duration: 1.5,
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
