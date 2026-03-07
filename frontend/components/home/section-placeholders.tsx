'use client'

import { Skeleton } from '@/components/ui/skeleton'

/**
 * Fixed-height placeholder components for deferred sections.
 * Each placeholder matches the approximate height of its corresponding real section
 * to prevent Cumulative Layout Shift (CLS).
 */

export function FlashSalePlaceholder() {
  return (
    <div className="rounded-lg bg-white shadow-sm overflow-hidden h-80">
      {/* Header skeleton */}
      <div className="bg-[#8B1538] text-white px-2 sm:px-4 py-1.5 sm:py-2">
        <Skeleton className="h-5 w-32 bg-white/20" />
      </div>
      {/* Product grid skeleton */}
      <div className="p-1 sm:p-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="w-full aspect-square rounded" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function LuxuryDealPlaceholder() {
  return (
    <div className="rounded-lg bg-white shadow-sm overflow-hidden h-96">
      {/* Header skeleton */}
      <div className="bg-[#8B1538] text-white px-2 sm:px-4 py-1.5 sm:py-2">
        <Skeleton className="h-5 w-40 bg-white/20" />
      </div>
      {/* Carousel/Product display skeleton */}
      <div className="p-1 sm:p-2">
        <Skeleton className="w-full h-80 rounded" />
      </div>
    </div>
  )
}

export function TopPicksPlaceholder() {
  return (
    <div className="rounded-lg bg-white shadow-sm overflow-hidden h-80">
      {/* Header skeleton */}
      <div className="bg-[#8B1538] text-white px-2 sm:px-4 py-1.5 sm:py-2">
        <Skeleton className="h-5 w-28 bg-white/20" />
      </div>
      {/* Product grid skeleton */}
      <div className="p-1 sm:p-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="w-full aspect-square rounded" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function NewArrivalPlaceholder() {
  return (
    <div className="rounded-lg bg-white shadow-sm overflow-hidden h-80">
      {/* Header skeleton */}
      <div className="bg-[#8B1538] text-white px-2 sm:px-4 py-1.5 sm:py-2">
        <Skeleton className="h-5 w-36 bg-white/20" />
      </div>
      {/* Product grid skeleton */}
      <div className="p-1 sm:p-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="w-full aspect-square rounded" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function TrendingNowPlaceholder() {
  return (
    <div className="rounded-lg bg-white shadow-sm overflow-hidden h-80">
      {/* Header skeleton */}
      <div className="bg-[#8B1538] text-white px-2 sm:px-4 py-1.5 sm:py-2">
        <Skeleton className="h-5 w-32 bg-white/20" />
      </div>
      {/* Product grid skeleton */}
      <div className="p-1 sm:p-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="w-full aspect-square rounded" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function DailyFindPlaceholder() {
  return (
    <div className="rounded-lg bg-white shadow-sm overflow-hidden h-80">
      {/* Header skeleton */}
      <div className="bg-[#8B1538] text-white px-2 sm:px-4 py-1.5 sm:py-2">
        <Skeleton className="h-5 w-32 bg-white/20" />
      </div>
      {/* Product grid skeleton */}
      <div className="p-1 sm:p-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="w-full aspect-square rounded" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function AllProductsPlaceholder() {
  return (
    <div className="rounded-lg bg-white shadow-sm overflow-hidden h-96">
      {/* Header skeleton */}
      <div className="bg-[#8B1538] text-white px-2 sm:px-4 py-1.5 sm:py-2">
        <Skeleton className="h-5 w-28 bg-white/20" />
      </div>
      {/* Product grid skeleton */}
      <div className="p-1 sm:p-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="w-full aspect-square rounded" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function BrandShowcasePlaceholder() {
  return (
    <div className="rounded-lg bg-white shadow-sm overflow-hidden h-72">
      {/* Header skeleton */}
      <div className="bg-[#8B1538] text-white px-2 sm:px-4 py-1.5 sm:py-2">
        <Skeleton className="h-5 w-40 bg-white/20" />
      </div>
      {/* Brand grid skeleton */}
      <div className="p-1 sm:p-2">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="w-full aspect-square rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Combined placeholder for all deferred sections shown during Suspense
 */
export function DeferredSectionsPlaceholder() {
  return (
    <div className="grid gap-3 sm:gap-4 md:gap-8">
      <FlashSalePlaceholder />
      <LuxuryDealPlaceholder />
      <TopPicksPlaceholder />
      <NewArrivalPlaceholder />
      <TrendingNowPlaceholder />
      <DailyFindPlaceholder />
      <AllProductsPlaceholder />
      <BrandShowcasePlaceholder />
    </div>
  )
}
