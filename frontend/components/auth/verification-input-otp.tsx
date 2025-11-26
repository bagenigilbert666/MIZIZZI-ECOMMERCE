"use client"

import type React from "react"
import { useRef, useEffect } from "react"
import { motion } from "framer-motion"

interface VerificationInputOtpProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  length?: number
  onComplete?: (value: string) => void
}

export function VerificationInputOtp({
  value,
  onChange,
  disabled = false,
  length = 6,
  onComplete,
}: VerificationInputOtpProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, index: number) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length)

    if (pastedData) {
      onChange(pastedData)
      // Focus last filled input or the next empty one
      const nextIndex = Math.min(pastedData.length, length - 1)
      setTimeout(() => {
        inputRefs.current[nextIndex]?.focus()
      }, 0)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const digit = e.target.value.replace(/\D/g, "")

    if (digit.length > 1) {
      // If multiple digits pasted into single field
      const newValue = value.slice(0, index) + digit.slice(0, length - index)
      onChange(newValue.slice(0, length))

      // Auto-focus to the end or next empty field
      const focusIndex = Math.min(index + digit.length, length - 1)
      setTimeout(() => {
        inputRefs.current[focusIndex]?.focus()
      }, 0)
      return
    }

    if (digit === "") {
      // Allow deletion
      const newValue = value.slice(0, index) + value.slice(index + 1)
      onChange(newValue)
      return
    }

    // Single digit input
    const newValue = value.slice(0, index) + digit + value.slice(index + 1)
    onChange(newValue)

    // Auto-advance to next field
    if (digit && index < length - 1) {
      setTimeout(() => {
        inputRefs.current[index + 1]?.focus()
      }, 0)
    }

    // Trigger completion when all fields are filled
    if (newValue.length === length && onComplete) {
      setTimeout(() => {
        onComplete(newValue)
      }, 100)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && value[index] === "" && index > 0) {
      e.preventDefault()
      inputRefs.current[index - 1]?.focus()
    }

    // Allow arrow keys for navigation
    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault()
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault()
      inputRefs.current[index + 1]?.focus()
    }
  }

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length }).map((_, index) => (
        <motion.input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[index] || ""}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={(e) => handlePaste(e, index)}
          disabled={disabled}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05, duration: 0.2 }}
          className="h-14 w-12 text-center text-2xl font-bold rounded-lg border-2 border-gray-200 bg-white text-gray-900 transition-all duration-200 focus:border-cherry-500 focus:ring-2 focus:ring-cherry-100 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
      ))}
    </div>
  )
}
