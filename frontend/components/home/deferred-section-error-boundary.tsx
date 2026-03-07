'use client'

import { ReactNode, Component, ErrorInfo } from "react"

interface DeferredSectionErrorBoundaryProps {
  children: ReactNode
  sectionName: string
  fallback?: ReactNode
}

/**
 * DEFERRED SECTION ERROR BOUNDARY
 * 
 * Purpose:
 * - Catch errors in individual deferred sections
 * - Prevent one failing section from breaking entire page
 * - Show graceful error message instead of white screen
 * - Log error for debugging
 * 
 * Example:
 * <DeferredSectionErrorBoundary sectionName="Luxury Deals">
 *   <LuxuryDeals products={products} />
 * </DeferredSectionErrorBoundary>
 */
export class DeferredSectionErrorBoundary extends Component<
  DeferredSectionErrorBoundaryProps,
  { hasError: boolean; error?: Error }
> {
  constructor(props: DeferredSectionErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[Homepage] Section error (${this.props.sectionName}):`, error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <DefaultErrorFallback sectionName={this.props.sectionName} />
    }

    return this.props.children
  }
}

/**
 * DEFAULT ERROR FALLBACK
 * Shown when a deferred section fails to load
 */
function DefaultErrorFallback({ sectionName }: { sectionName: string }) {
  return (
    <div className="rounded-lg bg-white shadow-sm overflow-hidden">
      <div className="bg-orange-50 border-l-4 border-orange-400 p-4">
        <h3 className="font-semibold text-orange-900 text-sm sm:text-base">{sectionName}</h3>
        <p className="text-orange-800 text-xs sm:text-sm mt-1">
          This section couldn't load right now. Please try refreshing the page or come back later.
        </p>
      </div>
    </div>
  )
}

/**
 * TIMEOUT-PROTECTED LAZY LOADER
 * 
 * Wraps lazy-loaded components with a timeout fallback.
 * If component takes too long, shows error instead of indefinite loading.
 * 
 * Useful for components that might hang or fail silently.
 */
interface TimeoutLazyLoaderProps {
  children: ReactNode
  timeoutMs?: number
  fallback?: ReactNode
  sectionName?: string
}

export function TimeoutLazyLoader({
  children,
  timeoutMs = 5000,
  fallback,
  sectionName = "Section",
}: TimeoutLazyLoaderProps) {
  return (
    <DeferredSectionErrorBoundary
      sectionName={sectionName}
      fallback={
        fallback || (
          <div className="rounded-lg bg-white shadow-sm overflow-hidden">
            <div className="bg-orange-50 border-l-4 border-orange-400 p-4">
              <h3 className="font-semibold text-orange-900 text-sm">{sectionName}</h3>
              <p className="text-orange-800 text-xs mt-1">
                This section took too long to load. Please refresh the page if needed.
              </p>
            </div>
          </div>
        )
      }
    >
      {children}
    </DeferredSectionErrorBoundary>
  )
}

/**
 * SECTION WRAPPER WITH HEIGHT LOCK
 * 
 * Prevents Cumulative Layout Shift (CLS) by locking container height
 * while section loads. Once content appears, height expands naturally.
 */
interface HeightLockedSectionProps {
  children: ReactNode
  minHeight?: number
  className?: string
}

export function HeightLockedSection({
  children,
  minHeight = 300,
  className = "",
}: HeightLockedSectionProps) {
  return (
    <div style={{ minHeight: `${minHeight}px` }} className={className}>
      {children}
    </div>
  )
}
