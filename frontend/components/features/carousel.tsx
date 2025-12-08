"use client"

import { AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import { useCarousel } from "@/hooks/use-carousel"
import { useResponsiveLayout } from "@/hooks/use-responsive-layout"
import { CarouselSlide } from "@/components/carousel/carousel-slide"
import { CarouselNavigation } from "@/components/carousel/carousel-navigation"
import { FeatureCards } from "@/components/carousel/feature-cards"
import { ContactCTA } from "@/components/carousel/contact-cta"
import { PremiumCustomerExperience } from "@/components/carousel/premium-customer-experience"
import { ProductShowcase } from "@/components/carousel/product-showcase"
import useSWR from "swr"
import Image from "next/image"
import type { CarouselItem } from "@/types/carousel"

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "https://mizizzi-ecommerce-1.onrender.com"

const CAROUSEL_CACHE_KEY = "mizizzi_carousel_cache"
const CAROUSEL_CACHE_EXPIRY_KEY = "mizizzi_carousel_cache_expiry"
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

const getCachedCarousel = (): CarouselItem[] | null => {
  if (typeof window === "undefined") return null

  try {
    const expiry = localStorage.getItem(CAROUSEL_CACHE_EXPIRY_KEY)
    if (expiry && Date.now() > Number.parseInt(expiry, 10)) {
      // Cache expired, clear it
      localStorage.removeItem(CAROUSEL_CACHE_KEY)
      localStorage.removeItem(CAROUSEL_CACHE_EXPIRY_KEY)
      return null
    }

    const cached = localStorage.getItem(CAROUSEL_CACHE_KEY)
    if (cached) {
      return JSON.parse(cached)
    }
  } catch (e) {
    console.error("Error reading carousel cache:", e)
  }
  return null
}

const setCachedCarousel = (items: CarouselItem[]) => {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(CAROUSEL_CACHE_KEY, JSON.stringify(items))
    localStorage.setItem(CAROUSEL_CACHE_EXPIRY_KEY, String(Date.now() + CACHE_DURATION))
  } catch (e) {
    console.error("Error saving carousel cache:", e)
  }
}

const carouselFetcher = async (url: string): Promise<CarouselItem[]> => {
  const response = await fetch(url)
  const data = await response.json()

  if (data.success && data.items && data.items.length > 0) {
    const items = data.items.map((item: any) => ({
      image: item.image_url,
      title: item.title,
      description: item.description,
      buttonText: item.button_text || "Shop Now",
      href: item.link_url || "/products",
      badge: item.badge_text,
      discount: item.discount,
    }))
    setCachedCarousel(items)
    return items
  }

  const cached = getCachedCarousel()
  return cached || []
}

const HeroSkeleton = ({ isDesktop, sidePanelsVisible }: { isDesktop: boolean; sidePanelsVisible: boolean }) => (
  <div className="relative overflow-hidden">
    <div
      className={cn(
        "relative w-full",
        isDesktop && sidePanelsVisible
          ? "mx-auto max-w-[1200px] grid gap-3 sm:gap-4 xl:grid-cols-[1fr,280px] xl:px-2"
          : "sm:mx-auto sm:max-w-[1200px]",
      )}
    >
      <div
        className={cn(
          "relative w-full overflow-hidden",
          "rounded-xl border border-gray-100 bg-gradient-to-br from-[#8B1538]/5 via-white to-[#8B1538]/10",
          "h-[200px] xs:h-[220px] sm:h-[400px] md:h-[450px] lg:h-[500px] xl:h-[400px]",
        )}
      >
        {/* Animated shimmer overlay */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]"
            style={{
              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
            }}
          />
        </div>

        {/* Content placeholder */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
          {/* Logo placeholder */}
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 mb-4 rounded-full bg-white/80 shadow-sm flex items-center justify-center overflow-hidden">
            <Image
              src="/images/screenshot-20from-202025-02-18-2013-30-22.png"
              alt="Mizizzi"
              width={48}
              height={48}
              className="object-contain opacity-60"
            />
          </div>

          {/* Welcome text */}
          <div className="space-y-3 max-w-md">
            <div className="h-6 sm:h-8 w-48 sm:w-64 bg-[#8B1538]/10 rounded-full mx-auto animate-pulse" />
            <div className="h-4 sm:h-5 w-64 sm:w-80 bg-gray-200/80 rounded-full mx-auto animate-pulse" />
            <div className="h-4 sm:h-5 w-56 sm:w-72 bg-gray-200/60 rounded-full mx-auto animate-pulse" />
          </div>

          {/* CTA placeholder */}
          <div className="mt-6 h-10 sm:h-12 w-32 sm:w-40 bg-[#8B1538]/20 rounded-full animate-pulse" />

          {/* Dots indicator */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={cn("w-2 h-2 rounded-full", i === 0 ? "bg-[#8B1538]/40 w-6" : "bg-gray-300/60")} />
            ))}
          </div>
        </div>
      </div>

      {/* Side cards skeleton - desktop only */}
      <aside className="hidden lg:flex flex-col gap-3 xl:h-[400px]">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="flex-1 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-100 p-4 flex flex-col justify-center items-center"
          >
            <div className="w-10 h-10 rounded-full bg-gray-200/80 mb-3 animate-pulse" />
            <div className="h-4 w-24 bg-gray-200/80 rounded-full mb-2 animate-pulse" />
            <div className="h-3 w-32 bg-gray-200/60 rounded-full animate-pulse" />
          </div>
        ))}
      </aside>
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

export function Carousel() {
  const { sidePanelsVisible, isDesktop } = useResponsiveLayout()
  const [imagesLoaded, setImagesLoaded] = useState(false)

  const [initialData] = useState<CarouselItem[]>(() => getCachedCarousel() || [])

  const { data: carouselItems = initialData, isLoading } = useSWR(
    `${API_BASE_URL}/api/carousel/items?position=homepage`,
    carouselFetcher,
    {
      fallbackData: initialData.length > 0 ? initialData : undefined,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
      errorRetryCount: 2,
      keepPreviousData: true,
    },
  )

  const { currentSlide, direction, isPaused, nextSlide, prevSlide, pause, resume } = useCarousel({
    itemsLength: carouselItems.length || 1,
    autoPlay: carouselItems.length > 0,
  })

  const [prevSlideIndex, setPrevSlideIndex] = useState(currentSlide)

  useEffect(() => {
    const timer = setTimeout(() => {
      setPrevSlideIndex(currentSlide)
    }, 600)
    return () => clearTimeout(timer)
  }, [currentSlide])

  useEffect(() => {
    if (carouselItems.length > 0) {
      let loadedCount = 0
      carouselItems.forEach((item) => {
        const img = new window.Image()
        img.crossOrigin = "anonymous"
        img.onload = () => {
          loadedCount++
          if (loadedCount === carouselItems.length) {
            setImagesLoaded(true)
          }
        }
        img.onerror = () => {
          loadedCount++
          if (loadedCount === carouselItems.length) {
            setImagesLoaded(true)
          }
        }
        img.src = item.image
      })
    }
  }, [carouselItems])

  const activeItem = carouselItems[currentSlide]
  const prevItem = carouselItems[prevSlideIndex]

  if (carouselItems.length === 0 && isLoading) {
    return <HeroSkeleton isDesktop={isDesktop} sidePanelsVisible={sidePanelsVisible} />
  }

  if (carouselItems.length === 0) {
    return null
  }

  return (
    <div className="relative overflow-hidden">
      {isDesktop && sidePanelsVisible && (
        <div className="absolute left-0 top-0 z-10 hidden h-full w-[140px] transform p-2 xl:block xl:w-[220px]">
          <ProductShowcase />
        </div>
      )}

      {isDesktop && sidePanelsVisible && (
        <div className="absolute right-0 top-0 z-10 hidden h-full w-[280px] transform p-2 xl:block xl:w-[220px]">
          <PremiumCustomerExperience />
        </div>
      )}

      {/* Main carousel content */}
      <div
        className={cn(
          "relative w-full",
          isDesktop && sidePanelsVisible
            ? "mx-auto max-w-[1200px] grid gap-3 sm:gap-4 xl:grid-cols-[1fr,280px] xl:px-2"
            : "sm:mx-auto sm:max-w-[1200px]",
          "transition-all duration-300",
        )}
      >
        {/* Enhanced main carousel */}
        <main
          className={cn(
            "relative w-full overflow-hidden",
            "rounded-xl border border-gray-100 shadow-sm",
            "h-[200px] xs:h-[220px] sm:h-[400px] md:h-[450px] lg:h-[500px] xl:h-[400px]",
          )}
          onMouseEnter={pause}
          onMouseLeave={resume}
          onFocus={pause}
          onBlur={resume}
          role="region"
          aria-label="Featured products carousel"
          aria-live="polite"
        >
          <div className="absolute inset-0 z-0">
            {prevItem && (
              <Image
                src={prevItem.image || "/placeholder.svg"}
                alt=""
                fill
                className="object-cover"
                priority
                sizes="100vw"
                quality={90}
              />
            )}
          </div>

          <AnimatePresence initial={false} custom={direction} mode="sync">
            {activeItem && (
              <CarouselSlide
                key={currentSlide}
                item={activeItem as any}
                isActive={true}
                index={currentSlide}
                direction={direction}
              />
            )}
          </AnimatePresence>

          {/* Navigation arrows */}
          {carouselItems.length > 1 && (
            <CarouselNavigation
              onPrevious={prevSlide}
              onNext={nextSlide}
              isPaused={isPaused}
              onPause={pause}
              onResume={resume}
            />
          )}
        </main>

        {/* Side cards - Large tablets and desktop only */}
        <aside className={cn("hidden flex-col gap-3 lg:flex xl:h-[400px]")} aria-label="Quick actions and promotions">
          <FeatureCards />
          <ContactCTA />
        </aside>
      </div>
    </div>
  )
}
