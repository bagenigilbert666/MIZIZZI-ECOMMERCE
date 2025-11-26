"use client"

import { motion } from "framer-motion"
import { GoogleAuthButton } from "./google-auth-button"

interface OAuthButtonsGroupProps {
  mode?: "signup" | "signin"
  showDivider?: boolean
  showLabel?: boolean
}

export function OAuthButtonsGroup({ mode = "signup", showDivider = true, showLabel = true }: OAuthButtonsGroupProps) {
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" },
    },
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="w-full space-y-3">
      {showLabel && (
        <motion.div variants={itemVariants} className="text-center text-sm text-gray-500">
          {mode === "signup" ? "Sign up with" : "Sign in with"}
        </motion.div>
      )}

      {showDivider && (
        <motion.div variants={itemVariants} className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
          <span className="text-xs text-gray-400 font-medium">OR</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
        </motion.div>
      )}

      <motion.div variants={itemVariants} className="w-full">
        <GoogleAuthButton mode={mode} fullWidth />
      </motion.div>

      <motion.div variants={itemVariants} className="hidden sm:block">
        <button
          disabled
          className="w-full h-11 bg-black text-white border-2 border-gray-800 hover:border-black rounded-lg font-medium text-sm transition-all duration-300 disabled:opacity-50"
        >
          Continue with Apple
        </button>
      </motion.div>
    </motion.div>
  )
}
