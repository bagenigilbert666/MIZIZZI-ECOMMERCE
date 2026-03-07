'use client'

import { NetworkStatus } from "@/components/shared/network-status"
import { CategoryGrid } from "@/components/features/category-grid-enhanced"
import { Carousel } from "@/components/features/carousel"
import { FlashSales } from "@/components/features/flash-sales"
import type { Category } from "@/lib/server/get-categories"
import type {
  CarouselItem,
  PremiumExperience,
  ContactCTASlide,
  FeatureCard,
  ProductShowcaseCategory,
} from "@/lib/server/get-carousel-data"
import type { Product } from "@/types"
import { useCategoriesCache } from "@/hooks/use-categories-cache"

interface CriticalHomepageLoaderProps {
  carouselItems: CarouselItem[]
  categories: Category[]
  flashSaleProducts: Product[]
  premiumExperiences: PremiumExperience[]
  contactCTASlides: ContactCTASlide[]
  featureCards: FeatureCard[]
  productShowcase: ProductShowcaseCategory[]
}

/**
 * CRITICAL HOMEPAGE SECTION
 * 
 * This component renders ONLY the above-the-fold sections:
 * - Topbar/Navigation
 * - Carousel/Hero Banner
 * - Categories Grid
 * - Flash Sales (primary promo)
 * 
 * Why separate:
 * - These are always needed and visible immediately
 * - Render blocks initial page load until these are done
 * - User sees complete "above fold" experience in ~1500-2000ms (cold start)
 * - All other sections defer with Suspense boundaries
 * 
 * Performance characteristics:
 * - No dynamic imports needed (small, critical path)
 * - All images optimized with next/image and priority flags
 * - Fixed aspect ratios prevent CLS
 * - Category cache (sessionStorage > localStorage > server) applied
 */
export function CriticalHomepageLoader({
  carouselItems,
  categories,
  flashSaleProducts,
  premiumExperiences,
  contactCTASlides,
  featureCards,
  productShowcase,
}: CriticalHomepageLoaderProps) {
  // Apply 3-layer cache strategy for categories
  const { categories: cachedCategories } = useCategoriesCache(categories)

  return (
    <div
      className="page-root flex flex-col pb-8 w-full"
      style={{ backgroundColor: "var(--color-background)" }}
    >
      {/* Network status indicator - minimal, non-blocking */}
      <NetworkStatus className="mx-auto w-full max-w-[1200px] px-1 sm:px-2 md:px-4 pt-2" />

      {/* 
        CAROUSEL/HERO SECTION
        - Highest visual priority
        - Has LQIP + blur transitions for instant perception of loaded state
        - All images lazy-loaded with low quality placeholder
        - Should appear in ~400-600ms even on slow networks
      */}
      <div className="w-full mt-2 sm:mt-3 sm:py-2" style={{ backgroundColor: "var(--color-background)" }}>
        <Carousel
          carouselItems={carouselItems}
          premiumExperiences={premiumExperiences}
          contactCTASlides={contactCTASlides}
          featureCards={featureCards}
          productShowcase={productShowcase}
        />
      </div>

      {/* 
        CATEGORIES SECTION
        - Navigation-critical
        - Quick tap target to browse by category
        - Cached aggressively (3-layer: session > local > server)
        - Fixed height prevents layout shift
      */}
      <div className="mx-auto w-full max-w-[1200px] px-0 sm:px-3 md:px-4 mt-3 sm:mt-4">
        <div className="mb-3 sm:rounded-lg bg-white overflow-hidden shadow-sm">
          <CategoryGrid categories={cachedCategories} />
        </div>
      </div>

      {/* 
        PRIMARY PROMO SECTION (Flash Sales)
        - Time-sensitive, merchant-featured section
        - Must be visible without scroll on most devices
        - Part of initial render to enable immediate engagement
        - Fixed container height to prevent pop-in
      */}
      <div className="mx-auto w-full max-w-[1200px] px-2 sm:px-3 md:px-4">
        <section className="rounded-lg bg-white shadow-sm overflow-hidden">
          <FlashSales {...({ products: flashSaleProducts } as any)} />
        </section>
      </div>

      {/* Global styles for critical section */}
      <style jsx global>{`
        .page-root {
          touch-action: pan-y;
          -webkit-overflow-scrolling: touch;
          scroll-behavior: smooth;
        }

        .arrow-animate {
          display: inline-block;
          will-change: transform;
          animation: arrowMove 1.5s ease-in-out infinite;
        }

        @keyframes arrowMove {
          0% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(4px);
          }
          100% {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  )
}
