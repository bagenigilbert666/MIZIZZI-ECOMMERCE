"use client"

import Image from "next/image"

interface LogoLoaderProps {
  size?: "sm" | "md" | "lg"
}

export function LogoLoader({ size = "sm" }: LogoLoaderProps) {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-20 h-20",
  }

  return (
    <div className="relative inline-flex items-center justify-center">
      <div className={`${sizeClasses[size]} relative animate-spin`}>
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png"
          alt="MIZIZZI"
          width={80}
          height={80}
          className="h-full w-full object-contain"
          priority
        />
      </div>
    </div>
  )
}
