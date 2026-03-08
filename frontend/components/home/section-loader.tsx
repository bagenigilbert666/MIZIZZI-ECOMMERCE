"use client"

interface SectionLoaderProps {
  height?: string
}

export function SectionLoader({ height = "h-80" }: SectionLoaderProps) {
  return (
    <div className={`rounded-lg bg-white shadow-sm overflow-hidden flex items-center justify-center ${height}`}>
      <svg
        className="animate-spin"
        width="64"
        height="64"
        viewBox="0 0 50 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="25"
          cy="25"
          r="20"
          stroke="#6B0F2B"
          strokeWidth="4"
          strokeDasharray="31.4 125.6"
          opacity="0.3"
        />
        <circle
          cx="25"
          cy="25"
          r="20"
          stroke="#8B1538"
          strokeWidth="4"
          strokeDasharray="31.4 125.6"
          strokeLinecap="round"
          style={{
            animation: "spin 1.4s linear infinite",
          }}
        />
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </svg>
    </div>
  )
}
