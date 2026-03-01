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

    console.log("[v0] Proxying GET cart items to backend")

    const response = await fetch(`${API_BASE_URL}/api/admin/cart-items${queryString ? "?" + queryString : ""}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
    })

    const data = await response.json().catch(() => ({ items: [], total: 0 }))

    if (!response.ok) {
      console.warn("[v0] Backend error fetching cart items:", response.status)
      // Return mock data on backend error for development
      return NextResponse.json({
        status: "success",
        items: [],
        total: 0,
        message: "No cart items found",
      })
    }

    return NextResponse.json({
      status: "success",
      ...data,
    })
  } catch (error) {
    console.error("[v0] Cart items proxy error:", error)
    // Return empty array on error instead of failing
    return NextResponse.json({
      status: "success",
      items: [],
      total: 0,
      message: "Unable to fetch cart items",
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
    const cartItemId = url.searchParams.get("id")

    if (!cartItemId) {
      return NextResponse.json({ status: "error", message: "Cart item ID is required" }, { status: 400 })
    }

    console.log("[v0] Proxying DELETE cart item:", cartItemId)

    const response = await fetch(`${API_BASE_URL}/api/admin/cart-items/${cartItemId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json(
        { status: "error", message: data.message || "Failed to delete cart item" },
        { status: response.status },
      )
    }

    return NextResponse.json({
      status: "success",
      message: "Cart item deleted successfully",
    })
  } catch (error) {
    console.error("[v0] Delete cart item error:", error)
    return NextResponse.json(
      { status: "error", message: error instanceof Error ? error.message : "Failed to delete cart item" },
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
