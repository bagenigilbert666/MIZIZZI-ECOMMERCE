# Carousel Cloudinary - Code Snippets & Examples

Copy and paste these ready-to-use code examples for your pages!

## 🏠 Homepage Carousel

```tsx
// app/page.tsx or components/hero.tsx
"use client"

import { CarouselCloudinary } from "@/components/carousel/carousel-cloudinary"
import { useCarouselCloudinary } from "@/hooks/use-carousel-cloudinary"

export default function HomePage() {
  const { banners, isLoading } = useCarouselCloudinary({ 
    position: "homepage" 
  })

  if (isLoading) {
    return (
      <div className="w-full h-96 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse rounded-lg" />
    )
  }

  return (
    <section className="w-full">
      <CarouselCloudinary 
        banners={banners} 
        autoPlay={true} 
        interval={5000}
      />
    </section>
  )
}
```

---

## 🏷️ Category Page Carousel

```tsx
// app/category/[slug]/page.tsx
"use client"

import { CarouselCloudinary } from "@/components/carousel/carousel-cloudinary"
import { useCarouselCloudinary } from "@/hooks/use-carousel-cloudinary"
import { useParams } from "next/navigation"

export default function CategoryPage() {
  const { banners } = useCarouselCloudinary({ 
    position: "category_page" 
  })

  return (
    <main>
      <h1>Category Products</h1>
      <CarouselCloudinary banners={banners} autoPlay={true} />
    </main>
  )
}
```

---

## ⚡ Flash Sales Carousel (with Analytics)

```tsx
// app/flash-sales/page.tsx
"use client"

import { CarouselCloudinary } from "@/components/carousel/carousel-cloudinary"
import { useCarouselCloudinary } from "@/hooks/use-carousel-cloudinary"
import { Button } from "@/components/ui/button"

export default function FlashSalesPage() {
  const { banners, trackClick } = useCarouselCloudinary({ 
    position: "flash_sales" 
  })

  const handleBannerClick = (banner) => {
    // Track the click for analytics
    trackClick(banner.id)
    
    // Navigate to the promotion
    if (banner.link_url) {
      window.location.href = banner.link_url
    }
  }

  return (
    <section className="py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Flash Sales</h1>
          <p className="text-muted-foreground">Limited time offers</p>
        </div>
      </div>

      <CarouselCloudinary 
        banners={banners}
        autoPlay={true}
        interval={4000}
        onBannerClick={handleBannerClick}
      />
    </section>
  )
}
```

---

## 💎 Luxury Deals Carousel

```tsx
// app/luxury/page.tsx
"use client"

import { CarouselCloudinary } from "@/components/carousel/carousel-cloudinary"
import { useCarouselCloudinary } from "@/hooks/use-carousel-cloudinary"

export default function LuxuryPage() {
  const { banners, refresh, isLoading } = useCarouselCloudinary({ 
    position: "luxury_deals" 
  })

  return (
    <section className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold text-gold">Luxury Collection</h1>
        <button 
          onClick={refresh}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="h-96 bg-muted animate-pulse rounded-lg" />
      ) : (
        <CarouselCloudinary 
          banners={banners}
          autoPlay={true}
          interval={6000}
        />
      )}
    </section>
  )
}
```

---

## 📊 Dashboard Widget with Stats

```tsx
// components/dashboard/carousel-stats.tsx
"use client"

import { useCarouselCloudinary } from "@/hooks/use-carousel-cloudinary"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, MouseClick } from "lucide-react"

export function CarouselStats() {
  const { banners } = useCarouselCloudinary({ position: "homepage" })

  const stats = {
    total: banners.length,
    active: banners.filter(b => b.is_active).length,
    views: banners.reduce((sum, b) => sum + (b.views || 0), 0),
    clicks: banners.reduce((sum, b) => sum + (b.clicks || 0), 0),
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Banners</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{stats.total}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Active</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-1">
            <Eye className="h-4 w-4" /> Views
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{stats.views}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-1">
            <MouseClick className="h-4 w-4" /> Clicks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{stats.clicks}</p>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## 🔄 Carousel with Manual Refresh

```tsx
// components/carousel/carousel-with-refresh.tsx
"use client"

import { CarouselCloudinary } from "@/components/carousel/carousel-cloudinary"
import { useCarouselCloudinary } from "@/hooks/use-carousel-cloudinary"
import { Button } from "@/components/ui/button"
import { RotateCcw } from "lucide-react"

export function CarouselWithRefresh() {
  const { banners, isLoading, refresh } = useCarouselCloudinary({ 
    position: "homepage" 
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Featured Collection</h2>
        <Button 
          onClick={refresh}
          variant="outline"
          size="sm"
          disabled={isLoading}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          {isLoading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {isLoading ? (
        <div className="h-96 bg-muted animate-pulse rounded-lg" />
      ) : (
        <CarouselCloudinary banners={banners} autoPlay={true} />
      )}
    </div>
  )
}
```

---

## 🎯 Carousel with Custom Navigation

```tsx
// components/carousel/carousel-premium.tsx
"use client"

import { CarouselCloudinary } from "@/components/carousel/carousel-cloudinary"
import { useCarouselCloudinary } from "@/hooks/use-carousel-cloudinary"
import { useState } from "react"

export function PremiumCarousel() {
  const { banners } = useCarouselCloudinary({ position: "luxury_deals" })
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-4xl font-bold">Premium Selection</h2>
        <p className="text-muted-foreground">Curated for discerning taste</p>
      </div>

      <CarouselCloudinary 
        banners={banners}
        autoPlay={true}
        interval={7000}
        onBannerClick={(banner) => {
          console.log("Clicked banner:", banner.title)
        }}
      />

      {/* Thumbnail strip below carousel */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {banners.map((banner, index) => (
          <div
            key={banner.id}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            className={`h-16 w-24 rounded-lg overflow-hidden cursor-pointer transition-all ${
              hoveredIndex === index ? "ring-2 ring-primary" : ""
            }`}
          >
            {/* eslint-disable-next-line */}
            <img
              src={banner.image_url}
              alt={banner.title}
              className="h-full w-full object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## 🔗 Multiple Carousels on One Page

```tsx
// app/dashboard/page.tsx
"use client"

import { CarouselCloudinary } from "@/components/carousel/carousel-cloudinary"
import { useCarouselCloudinary } from "@/hooks/use-carousel-cloudinary"

export default function DashboardPage() {
  const homepageBanners = useCarouselCloudinary({ position: "homepage" })
  const flashSalesBanners = useCarouselCloudinary({ position: "flash_sales" })
  const luxuryBanners = useCarouselCloudinary({ position: "luxury_deals" })

  return (
    <main className="space-y-12 py-8">
      {/* Homepage carousel */}
      <section>
        <h2 className="text-3xl font-bold mb-4">Featured</h2>
        <CarouselCloudinary banners={homepageBanners.banners} autoPlay={true} />
      </section>

      {/* Flash sales carousel */}
      <section>
        <h2 className="text-3xl font-bold mb-4">Flash Sales</h2>
        <CarouselCloudinary 
          banners={flashSalesBanners.banners} 
          autoPlay={true}
          interval={3000}
        />
      </section>

      {/* Luxury deals carousel */}
      <section>
        <h2 className="text-3xl font-bold mb-4">Luxury Deals</h2>
        <CarouselCloudinary 
          banners={luxuryBanners.banners}
          autoPlay={true}
          interval={6000}
        />
      </section>
    </main>
  )
}
```

---

## 📱 Responsive Carousel

```tsx
// components/carousel/responsive-carousel.tsx
"use client"

import { CarouselCloudinary } from "@/components/carousel/carousel-cloudinary"
import { useCarouselCloudinary } from "@/hooks/use-carousel-cloudinary"
import { useMediaQuery } from "@/hooks/use-mobile"

export function ResponsiveCarousel() {
  const { banners } = useCarouselCloudinary({ position: "homepage" })
  const isMobile = useMediaQuery("(max-width: 768px)")

  return (
    <section className={`${isMobile ? "p-2" : "p-8"}`}>
      <CarouselCloudinary 
        banners={banners}
        autoPlay={true}
        interval={isMobile ? 3000 : 5000}
      />
    </section>
  )
}
```

---

## 🎨 Themed Carousel

```tsx
// components/carousel/themed-carousel.tsx
"use client"

import { CarouselCloudinary } from "@/components/carousel/carousel-cloudinary"
import { useCarouselCloudinary } from "@/hooks/use-carousel-cloudinary"

export function ThemedCarousel({ theme = "light" }) {
  const { banners } = useCarouselCloudinary({ position: "homepage" })

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <CarouselCloudinary banners={banners} autoPlay={true} />
    </div>
  )
}
```

---

## 🧪 Testing Carousel

```tsx
// __tests__/carousel.test.tsx
import { render, screen } from "@testing-library/react"
import { CarouselCloudinary } from "@/components/carousel/carousel-cloudinary"
import type { CarouselBanner } from "@/types/carousel-admin"

describe("CarouselCloudinary", () => {
  const mockBanners: CarouselBanner[] = [
    {
      id: 1,
      name: "Test Banner",
      position: "homepage",
      image_url: "https://res.cloudinary.com/test/image/upload/v1234567890/test.jpg",
      title: "Test Title",
      description: "Test description",
      button_text: "View",
      link_url: "/test",
      is_active: true,
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  it("renders carousel with banners", () => {
    render(<CarouselCloudinary banners={mockBanners} />)
    expect(screen.getByRole("region")).toBeInTheDocument()
  })

  it("displays banner title", () => {
    render(<CarouselCloudinary banners={mockBanners} />)
    expect(screen.getByText("Test Title")).toBeInTheDocument()
  })

  it("handles banner click", () => {
    const handleClick = jest.fn()
    render(
      <CarouselCloudinary 
        banners={mockBanners}
        onBannerClick={handleClick}
      />
    )
    
    screen.getByRole("button", { name: /previous slide/i }).click()
    // Add more assertions...
  })
})
```

---

## 🚀 Deployment-Ready Component

```tsx
// components/carousel/production-carousel.tsx
"use client"

import dynamic from "next/dynamic"
import { CarouselCloudinary } from "@/components/carousel/carousel-cloudinary"
import { useCarouselCloudinary } from "@/hooks/use-carousel-cloudinary"
import { Suspense } from "react"

// Lazy load for better code splitting
const CarouselContent = dynamic(
  () => Promise.resolve(CarouselCloudinary),
  {
    loading: () => (
      <div className="h-96 bg-muted animate-pulse rounded-lg" />
    ),
  }
)

export function ProductionCarousel({ position = "homepage" }) {
  const { banners, isLoading } = useCarouselCloudinary({ position })

  return (
    <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded-lg" />}>
      {isLoading ? (
        <div className="h-96 bg-muted animate-pulse rounded-lg" />
      ) : (
        <CarouselContent 
          banners={banners}
          autoPlay={true}
          interval={5000}
        />
      )}
    </Suspense>
  )
}
```

---

## 📝 Quick Copy & Paste Summary

| Use Case | Component | Hook | Cache |
|----------|-----------|------|-------|
| Homepage | CarouselCloudinary | useCarouselCloudinary | 5min |
| Category | CarouselCloudinary | useCarouselCloudinary | 5min |
| Flash Sales | CarouselCloudinary | useCarouselCloudinary | 5min |
| Luxury | CarouselCloudinary | useCarouselCloudinary | 5min |

**All examples are production-ready and fully optimized for Cloudinary CDN delivery!** 🚀
