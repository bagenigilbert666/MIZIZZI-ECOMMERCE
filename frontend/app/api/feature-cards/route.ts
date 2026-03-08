import { NextResponse } from "next/server"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

// Default feature cards for fallback
const DEFAULT_CARDS = [
  {
    id: 1,
    icon: "Zap",
    title: "FLASH SALES",
    description: "Limited Time Offers",
    href: "/flash-sales",
    iconBg: "bg-gradient-to-br from-amber-100 via-yellow-50 to-orange-100",
    iconColor: "text-amber-600",
    hoverBg: "hover:bg-amber-50/80",
    badge: "HOT",
  },
  {
    id: 2,
    icon: "Crown",
    title: "LUXURY DEALS",
    description: "Premium Collections",
    href: "/luxury",
    iconBg: "bg-gradient-to-br from-violet-100 via-purple-50 to-indigo-100",
    iconColor: "text-violet-600",
    hoverBg: "hover:bg-violet-50/80",
    badge: "VIP",
  },
  {
    id: 3,
    icon: "Heart",
    title: "WISHLIST",
    description: "Save Your Favorites",
    href: "/wishlist",
    iconBg: "bg-gradient-to-br from-rose-100 via-pink-50 to-red-100",
    iconColor: "text-rose-600",
    hoverBg: "hover:bg-rose-50/80",
  },
  {
    id: 4,
    icon: "Package",
    title: "ORDERS",
    description: "Track Your Purchases",
    href: "/orders",
    iconBg: "bg-gradient-to-br from-sky-100 via-blue-50 to-cyan-100",
    iconColor: "text-sky-600",
    hoverBg: "hover:bg-sky-50/80",
  },
  {
    id: 5,
    icon: "HeadphonesIcon",
    title: "SUPPORT",
    description: "24/7 Assistance",
    href: "/help",
    iconBg: "bg-gradient-to-br from-emerald-100 via-green-50 to-teal-100",
    iconColor: "text-emerald-600",
    hoverBg: "hover:bg-emerald-50/80",
  },
  {
    id: 6,
    icon: "Search",
    title: "PRODUCTS",
    description: "Browse All Items",
    href: "/products",
    iconBg: "bg-gradient-to-br from-slate-100 via-gray-50 to-zinc-100",
    iconColor: "text-slate-600",
    hoverBg: "hover:bg-slate-50/80",
  },
]

export async function GET(request: Request) {
  try {
    // Check for cache bypass parameter (used during cache invalidation)
    const url = new URL(request.url)
    const bypassCache = url.searchParams.get('bypass_cache') === 'true'
    
    // Fetch from backend API with shorter cache for faster updates
    // Add bypass parameter to backend if provided
    const backendUrl = bypassCache 
      ? `${API_BASE_URL}/api/feature-cards?bypass_cache=true`
      : `${API_BASE_URL}/api/feature-cards`
    
    const response = await fetch(backendUrl, {
      next: { 
        revalidate: bypassCache ? 0 : 60, // No cache on bypass, 1 min otherwise
        tags: ['feature-cards'] // Allow targeted invalidation
      },
    })

    if (response.ok) {
      const data = await response.json()
      if (data && Array.isArray(data) && data.length > 0) {
        return NextResponse.json(data, {
          headers: {
            'Cache-Control': bypassCache 
              ? 'no-cache, no-store, max-age=0'
              : 'public, s-maxage=60, stale-while-revalidate=120'
          }
        })
      }
    }

    // Return default cards if API fails or returns empty
    return NextResponse.json(DEFAULT_CARDS, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
      }
    })
  } catch (error) {
    console.error('[Feature Cards API] Error:', error)
    // Return default cards on error with short cache
    return NextResponse.json(DEFAULT_CARDS, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
      }
    })
  }
}
