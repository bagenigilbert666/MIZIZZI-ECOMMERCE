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

    console.log("[v0] Proxying GET abandoned carts to backend")

    const response = await fetch(`${API_BASE_URL}/api/admin/abandoned-carts${queryString ? "?" + queryString : ""}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
    })

    const data = await response.json().catch(() => ({ carts: [], total: 0 }))

    if (!response.ok) {
      console.warn("[v0] Backend error fetching abandoned carts:", response.status)
      return NextResponse.json({
        status: "success",
        carts: [],
        total: 0,
        recovery_value: 0,
        message: "No abandoned carts found",
      })
    }

    return NextResponse.json({
      status: "success",
      ...data,
    })
  } catch (error) {
    console.error("[v0] Abandoned carts proxy error:", error)
    return NextResponse.json({
      status: "success",
      carts: [],
      total: 0,
      recovery_value: 0,
      message: "Unable to fetch abandoned carts",
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
    const cartId = url.searchParams.get("id")

    if (!cartId) {
      return NextResponse.json({ status: "error", message: "Cart ID is required" }, { status: 400 })
    }

    console.log("[v0] Proxying DELETE abandoned cart:", cartId)

    const response = await fetch(`${API_BASE_URL}/api/admin/abandoned-carts/${cartId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json(
        { status: "error", message: data.message || "Failed to delete abandoned cart" },
        { status: response.status },
      )
    }

    return NextResponse.json({
      status: "success",
      message: "Abandoned cart deleted successfully",
    })
  } catch (error) {
    console.error("[v0] Delete abandoned cart error:", error)
    return NextResponse.json(
      { status: "error", message: error instanceof Error ? error.message : "Failed to delete abandoned cart" },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) {
      return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { cartId, emailContent } = body

    if (!cartId || !emailContent) {
      return NextResponse.json(
        { status: "error", message: "Cart ID and email content are required" },
        { status: 400 },
      )
    }

    console.log("[v0] Proxying POST send recovery email for cart:", cartId)

    const response = await fetch(`${API_BASE_URL}/api/admin/abandoned-carts/${cartId}/send-recovery-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({ content: emailContent }),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json(
        { status: "error", message: data.message || "Failed to send recovery email" },
        { status: response.status },
      )
    }

    return NextResponse.json({
      status: "success",
      message: "Recovery email sent successfully",
    })
  } catch (error) {
    console.error("[v0] Send recovery email error:", error)
    return NextResponse.json(
      { status: "error", message: error instanceof Error ? error.message : "Failed to send recovery email" },
      { status: 500 },
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, DELETE, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}
