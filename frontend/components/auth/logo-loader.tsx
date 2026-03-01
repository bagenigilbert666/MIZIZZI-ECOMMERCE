"use client"

import { Loader } from "@/components/ui/loader"

interface LogoLoaderProps {
  size?: "sm" | "md" | "lg"
}

/**
 * Logo loader - Shows an elegant spinner for authentication loading states
 * Replaces the old spinning logo with a modern, responsive animation
 */
export function LogoLoader({ size = "sm" }: LogoLoaderProps) {
  return (
    <Loader size={size} />
  )
}
