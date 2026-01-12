"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { NetworkStatus } from "@/components/shared/network-status"
import { CategoryGrid } from "@/components/features/category-grid-enhanced"
import { Carousel } from "@/components/features/carousel"
import { ShoppingBag, Star, Package } from "lucide-react"
import { FlashSales } from "@/components/features/flash-sales"
import { LuxuryDeals } from "@/components/features/luxury-deals"
import { NewArrivals } from "@/components/features/new-arrivals"
import { TopPicks } from "@/components/features/top-picks"
import { TrendingNow } from "@/components/features/trending-now"
import { DailyFinds } from "@/components/features/daily-finds"
import type { Product } from "@/types"

const SectionSkeleton = ({ icon: Icon, title, color = "#8B1538" }: { icon?: any; title?: string; color?: string }) => (
  <div className="w-full">
    <div
      style={{ backgroundColor: color }}
      className="text-white flex items-center justify-between px-2 sm:px-4 py-1.5 sm:py-2"
    >
      <div className="flex items-center gap-1 sm:gap-2">
        {Icon && <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-300" />}
        <span className="font-bold text-sm sm:text-base">{title || "Loading..."}</span>
      </div>
      <div className="h-5 w-16 bg-white/20 rounded animate-pulse" />
    </div>
    <div className="p-2">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-2 sm:p-3 rounded-lg" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="aspect-square w-full bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden flex items-center justify-center rounded-lg mb-2">
              <div
                className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]"
                style={{
                  background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)",
                  animationDelay: `${i * 100}ms`,
                }}
              />
              <Package className="h-6 w-6 sm:h-8 sm:w-8 text-gray-300/60" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full bg-gray-200/80 rounded-full" />
              <div className="h-3 w-2/3 bg-gray-200/60 rounded-full" />
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, j) => (
                  <div key={j} className="h-2.5 w-2.5 bg-yellow-100 rounded-full" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
    <style jsx>{`
      @keyframes shimmer {
        100% {
          transform: translateX(200%);
        }
      }
    `}</style>
  </div>
)

const ProductGridSkeleton = () => (
  <div className="w-full">
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-6 lg:gap-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="bg-white p-2 sm:p-3" style={{ animationDelay: `${i * 80}ms` }}>
          <div className="aspect-[4/3] w-full bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden flex items-center justify-center rounded-lg mb-2">
            <div
              className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]"
              style={{
                background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)",
                animationDelay: `${i * 100}ms`,
              }}
            />
            <Package className="h-6 w-6 sm:h-8 sm:w-8 text-gray-300/60" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-3/4 bg-gray-200/80 rounded-full" />
            <div className="h-3 w-1/2 bg-gray-200/60 rounded-full" />
            <div className="h-4 w-1/3 bg-[#8B1538]/10 rounded-full" />
          </div>
        </div>
      ))}
    </div>
    <style jsx>{`
      @keyframes shimmer {
        100% {
          transform: translateX(200%);
        }
      }
    `}</style>
  </div>
)

const BrandShowcase = dynamic(() => import("@/components/features/brand-showcase").then((mod) => mod.BrandShowcase), {
  loading: () => <SectionSkeleton icon={Star} title="Top Brands" />,
  ssr: false,
})

const ProductGrid = dynamic(() => import("@/components/products/product-grid").then((mod) => mod.ProductGrid), {
  loading: () => <ProductGridSkeleton />,
  ssr: false,
})

interface HomeContentProps {
  flashSaleProducts: Product[]
  luxuryProducts: Product[]
  newArrivals: Product[]
  topPicks: Product[]
  trendingProducts: Product[]
  dailyFinds: Product[]
}

export function HomeContent({
  flashSaleProducts,
  luxuryProducts,
  newArrivals,
  topPicks,
  trendingProducts,
  dailyFinds,
}: HomeContentProps) {
  return (
    <>
      <div className="page-root flex flex-col pb-8 w-full" style={{ backgroundColor: "var(--color-background)" }}>
        <NetworkStatus className="mx-auto w-full max-w-[1200px] px-1 sm:px-2 md:px-4 pt-2" />

        <div className="w-full mt-2 sm:mt-3 sm:py-2" style={{ backgroundColor: "var(--color-background)" }}>
          <Carousel />
        </div>

        <div className="mx-auto w-full max-w-[1200px] px-0 sm:px-3 md:px-4 mt-3 sm:mt-4">
          <div className="mb-3 sm:rounded-lg bg-white overflow-hidden shadow-sm">
            <CategoryGrid />
          </div>
        </div>

        <div className="mx-auto w-full max-w-[1200px] px-2 sm:px-3 md:px-4">
          <div className="grid gap-3 sm:gap-4 md:gap-8 py-2 sm:py-4">
            <section className="rounded-lg bg-white shadow-sm overflow-hidden">
              <FlashSales products={flashSaleProducts} />
            </section>

            <section className="rounded-lg bg-white shadow-sm overflow-hidden">
              <LuxuryDeals products={luxuryProducts} />
            </section>

            <section className="rounded-lg bg-white shadow-sm overflow-hidden">
              <TopPicks products={topPicks} />
            </section>

            <section className="rounded-lg bg-white shadow-sm overflow-hidden">
              <NewArrivals products={newArrivals} />
            </section>

            <section className="rounded-lg bg-white shadow-sm overflow-hidden">
              <TrendingNow products={trendingProducts} />
            </section>

            <section className="rounded-lg bg-white shadow-sm overflow-hidden">
              <DailyFinds products={dailyFinds} />
            </section>

            <section className="rounded-lg bg-white shadow-sm overflow-hidden">
              <div className="bg-[#8B1538] text-white flex items-center justify-between px-2 sm:px-4 py-1.5 sm:py-2">
                <div className="flex items-center gap-1 sm:gap-2">
                  <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-300" />
                  <h2 className="font-bold text-sm sm:text-base md:text-lg whitespace-nowrap">All Products</h2>
                </div>
                <Link
                  href="/products"
                  className="group flex items-center gap-1 text-xs sm:text-sm font-medium text-white hover:text-yellow-300 transition-colors"
                >
                  View All
                  <span className="inline-block arrow-animate">→</span>
                </Link>
              </div>
              <div className="p-1 sm:p-2">
                <ProductGrid limit={12} />
              </div>
            </section>

            <section className="rounded-lg bg-white shadow-sm overflow-hidden">
              <BrandShowcase />
            </section>
          </div>
        </div>
      </div>
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
          0% { transform: translateX(0); }
          50% { transform: translateX(4px); }
          100% { transform: translateX(0); }
        }

        .page-root .carousel,
        .page-root .category-grid,
        .page-root .ProductGrid {
          will-change: transform, opacity;
        }
      `}</style>
    </>
  )
}
