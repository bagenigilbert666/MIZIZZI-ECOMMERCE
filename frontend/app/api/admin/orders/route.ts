import { type NextRequest, NextResponse } from "next/server"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://mizizzi-ecommerce-1.onrender.com"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    // Build query string from request params
    const queryString = new URLSearchParams()
    
    // Copy all params from the request
    for (const [key, value] of searchParams.entries()) {
      queryString.append(key, value)
    }

    // Ensure we get items
    if (!queryString.has("include_items")) {
      queryString.append("include_items", "true")
    }

    const backendUrl = `${API_BASE_URL}/api/admin/orders?${queryString.toString()}`

    console.log("[v0] Proxying orders request to:", backendUrl)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      next: {
        revalidate: 30, // Cache for 30 seconds
        tags: ["admin-orders"],
      },
    })

    clearTimeout(timeoutId)

    console.log("[v0] Backend orders response status:", response.status)

    if (!response.ok) {
      console.error("[v0] Backend returned error status:", response.status)
      return NextResponse.json(
        {
          items: [],
          pagination: {
            total_pages: 1,
            total_items: 0,
            current_page: 1,
          },
        },
        { status: 200 }, // Return 200 with empty data instead of error
      )
    }

    const data = await response.json()
    
    console.log("[v0] Successfully fetched", data?.items?.length || 0, "orders")

    return NextResponse.json(data || {
      items: [],
      pagination: {
        total_pages: 1,
        total_items: 0,
        current_page: 1,
      },
    })
  } catch (error) {
    console.error("[v0] Orders API proxy error:", error)
    return NextResponse.json(
      {
        items: [],
        pagination: {
          total_pages: 1,
          total_items: 0,
          current_page: 1,
        },
      },
      { status: 200 }, // Return 200 with empty data instead of error
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}
