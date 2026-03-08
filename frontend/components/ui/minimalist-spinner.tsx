'use client'

import { cn } from '@/lib/utils'

interface MinimalistSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  message?: string
  className?: string
}

export function MinimalistSpinner({
  size = 'lg',
  message,
  className
}: MinimalistSpinnerProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32'
  }

  const borderWidths = {
    sm: 'border-2',
    md: 'border-3',
    lg: 'border-4',
    xl: 'border-[6px]'
  }

  return (
    <div className={cn('flex flex-col items-center justify-center gap-4', className)}>
      {/* Minimalist rotating ring */}
      <div
        className={cn(
          'rounded-full border-t-[#8B1538] border-r-transparent border-b-transparent border-l-transparent',
          sizeClasses[size],
          borderWidths[size],
          'animate-spin'
        )}
        style={{
          borderTopColor: '#8B1538',
          borderRightColor: 'transparent',
          borderBottomColor: 'transparent',
          borderLeftColor: 'transparent',
          animation: 'spin 1.2s linear infinite'
        }}
        aria-label="Loading"
      />
      
      {/* Optional loading message */}
      {message && (
        <p className="text-sm text-gray-600 font-medium mt-2">
          {message}
        </p>
      )}
    </div>
  )
}
