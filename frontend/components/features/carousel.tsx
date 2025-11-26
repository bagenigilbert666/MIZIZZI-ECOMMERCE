"use client"

import { AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import { useCarousel } from "@/hooks/use-carousel"
import { useResponsiveLayout } from "@/hooks/use-responsive-layout"
import { Loader } from "@/components/ui/loader"
import { CarouselSlide } from "@/components/carousel/carousel-slide"
import { CarouselNavigation } from "@/components/carousel/carousel-navigation"
import { FeatureCards } from "@/components/carousel/feature-cards"
import { ContactCTA } from "@/components/carousel/contact-cta"
import { PremiumCustomerExperience } from "@/components/carousel/premium-customer-experience"
import { ProductShowcase } from "@/components/carousel/product-showcase"
import type { CarouselItem } from "@/types/carousel"

export function Carousel() {
  const { sidePanelsVisible, isDesktop } = useResponsiveLayout()
  const [carouselItems, setCarouselItems] = useState<CarouselItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { currentSlide, isPaused, nextSlide, prevSlide, pause, resume } = useCarousel({
    itemsLength: carouselItems.length,
    autoPlay: true,
  })

  useEffect(() => {
    const fetchCarouselItems = async () => {
      try {
        setIsLoading(true)
        const response = await fetch("/api/carousel/items?position=homepage")
        const data = await response.json()

        if (data.success && data.items) {
          setCarouselItems(
            data.items.map((item: any) => ({
              image: item.image_url,
              title: item.title,
              description: item.description,
              buttonText: item.button_text,
              href: item.link_url || "/products",
              badge: item.badge_text,
              discount: item.discount,
            })),
          )
        }
      } catch (error) {
        console.error("[v0] Error fetching carousel items:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCarouselItems()
  }, [])

  const activeItem = carouselItems[currentSlide]

  if (isLoading) {
    return (
      <div className="relative w-full overflow-hidden max-w-full">
        <main
          className="relative h-[300px] overflow-hidden rounded-xl shadow-sm sm:h-[400px] md:h-[450px] lg:h-[500px] xl:h-[400px]"
          role="region"
          aria-label="Featured products carousel loading"
        >
          <Loader />
        </main>
      </div>
    )
  }

  if (!carouselItems || carouselItems.length === 0) {
    return (
      <div className="relative w-full overflow-hidden max-w-full">
        <div 
          className="relative h-[300px] overflow-hidden rounded-xl shadow-sm sm:h-[400px] md:h-[450px] lg:h-[500px] xl:h-[400px] flex items-center justify-center"
          style={{ backgroundColor: "var(--color-background, #FFFFFF)" }}
        >
          <p className="text-white">No carousel items available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full overflow-hidden max-w-full">
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
          "relative mx-auto grid w-full max-w-[1200px] gap-3 sm:gap-4 overflow-hidden",
          isDesktop && sidePanelsVisible ? "xl:grid-cols-[1fr,280px] xl:px-2" : "px-2 sm:px-4",
          "transition-all duration-300",
        )}
      >
        {/* Enhanced main carousel */}
        <main
          className="relative h-[300px] overflow-hidden rounded-xl border border-gray-100 shadow-sm sm:h-[400px] md:h-[450px] lg:h-[500px] xl:h-[400px]"
          onMouseEnter={pause}
          onMouseLeave={resume}
          onFocus={pause}
          onBlur={resume}
          role="region"
          aria-label="Featured products carousel"
          aria-live="polite"
          style={{ backgroundColor: "var(--color-background, #FFFFFF)" }}
        >
          <div className="absolute inset-0">
            {/* IMPORTANT: Only one child inside AnimatePresence */}
            <AnimatePresence mode="wait" initial={false}>
              {activeItem ? (
                <CarouselSlide
                  key={String(currentSlide)}
                  item={activeItem as any}
                  isActive={true}
                  index={currentSlide}
                />
              ) : null}
            </AnimatePresence>
          </div>

          {/* Navigation arrows */}
          <CarouselNavigation
            onPrevious={prevSlide}
            onNext={nextSlide}
            isPaused={isPaused}
            onPause={pause}
            onResume={resume}
          />
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
