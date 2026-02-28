import { type NextRequest, NextResponse } from "next/server"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://mizizzi-ecommerce-1.onrender.com"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) {
      return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(request.url)
    const searchParams = new URLSearchParams(url.search)
    const queryString = searchParams.toString()

    console.log("[v0] Proxying GET wishlist items to backend")

    const response = await fetch(`${API_BASE_URL}/api/admin/wishlist-items${queryString ? "?" + queryString : ""}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
    })

    const data = await response.json().catch(() => ({ items: [], total: 0 }))

    if (!response.ok) {
      console.warn("[v0] Backend error fetching wishlist items:", response.status)
      return NextResponse.json({
        status: "success",
        items: [],
        total: 0,
        price_drops: 0,
        total_value: 0,
        message: "No wishlist items found",
      })
    }

    return NextResponse.json({
      status: "success",
      ...data,
    })
  } catch (error) {
    console.error("[v0] Wishlist items proxy error:", error)
    return NextResponse.json({
      status: "success",
      items: [],
      total: 0,
      price_drops: 0,
      total_value: 0,
      message: "Unable to fetch wishlist items",
    })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) {
      return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(request.url)
    const wishlistItemId = url.searchParams.get("id")

    if (!wishlistItemId) {
      return NextResponse.json({ status: "error", message: "Wishlist item ID is required" }, { status: 400 })
    }

    console.log("[v0] Proxying DELETE wishlist item:", wishlistItemId)

    const response = await fetch(`${API_BASE_URL}/api/admin/wishlist-items/${wishlistItemId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json(
        { status: "error", message: data.message || "Failed to delete wishlist item" },
        { status: response.status },
      )
    }

    return NextResponse.json({
      status: "success",
      message: "Wishlist item deleted successfully",
    })
  } catch (error) {
    console.error("[v0] Delete wishlist item error:", error)
    return NextResponse.json(
      { status: "error", message: error instanceof Error ? error.message : "Failed to delete wishlist item" },
      { status: 500 },
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}
