"use client"

import { MinimalistSpinner } from "@/components/ui/minimalist-spinner"

interface SectionLoaderProps {
  title: string
  height?: string
}

export function SectionLoader({ title, height = "h-80" }: SectionLoaderProps) {
  return (
    <div className={`rounded-lg bg-white shadow-sm overflow-hidden flex flex-col ${height}`}>
      <div className="bg-[#8B1538] text-white flex items-center justify-between px-2 sm:px-4 py-1.5 sm:py-2">
        <h2 className="font-bold text-sm sm:text-base md:text-lg whitespace-nowrap">{title}</h2>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <MinimalistSpinner size="lg" message="Loading..." />
        </div>
      </div>
    </div>
  )
}
