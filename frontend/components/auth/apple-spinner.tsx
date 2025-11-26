"use client"

interface AppleSpinnerProps {
  size?: "sm" | "md" | "lg"
}

export function AppleSpinner({ size = "md" }: AppleSpinnerProps) {
  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  }

  return (
    <div className={`${sizeClasses[size]} relative`}>
      <div className="absolute inset-0 rounded-full border-2 border-muted" />
      <div className="absolute inset-0 rounded-full border-2 border-foreground border-t-transparent animate-spin" />
    </div>
  )
}
