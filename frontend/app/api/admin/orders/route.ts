import { type NextRequest, NextResponse } from "next/server"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://mizizzi-ecommerce-1.onrender.com"
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@mizizzi.com"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123"

let cachedToken: { token: string; expiresAt: number } | null = null

async function getAdminToken(): Promise<string> {
  try {
    // Check if we have a cached token that's still valid
    if (cachedToken && cachedToken.expiresAt > Date.now()) {
      console.log("[v0] Using cached admin token")
      return cachedToken.token
    }

    console.log("[v0] Fetching new admin token from backend")

    const loginResponse = await fetch(`${API_BASE_URL}/api/admin/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      }),
    })

    if (!loginResponse.ok) {
      console.error(
        "[v0] Failed to get admin token:",
        loginResponse.status,
        loginResponse.statusText,
      )
      throw new Error(`Failed to authenticate: ${loginResponse.statusText}`)
    }

    const data = await loginResponse.json()
    const token = data.access_token || data.token

    if (!token) {
      throw new Error("No token in login response")
    }

    // Cache the token for 55 minutes (JWT typically lasts 1 hour)
    cachedToken = {
      token,
      expiresAt: Date.now() + 55 * 60 * 1000,
    }

    console.log("[v0] Successfully obtained admin token")
    return token
  } catch (error) {
    console.error("[v0] Error getting admin token:", error)
    throw error
  }
}

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

    // Get admin token for authentication
    const token = await getAdminToken()

    const backendUrl = `${API_BASE_URL}/api/admin/orders?${queryString.toString()}`

    console.log("[v0] Proxying orders request to:", backendUrl)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
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
      const errorText = await response.text()
      console.error("[v0] Backend error:", errorText)
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

    return NextResponse.json(
      data || {
        items: [],
        pagination: {
          total_pages: 1,
          total_items: 0,
          current_page: 1,
        },
      },
    )
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

