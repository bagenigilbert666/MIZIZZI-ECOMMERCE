import { type NextRequest, NextResponse } from "next/server"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://mizizzi-ecommerce-1.onrender.com"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.token) {
      return NextResponse.json({ status: "error", message: "Google token is required" }, { status: 400 })
    }

    console.log("[v0] Proxying admin Google login request to backend")

    const response = await fetch(`${API_BASE_URL}/api/admin/auth/google-login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: body.token }),
    })

    const data = await response.json().catch(() => ({}))

    console.log("[v0] Backend response status:", response.status)

    if (!response.ok) {
      // Return the backend error message if available
      return NextResponse.json(
        {
          status: "error",
          message: data.error || data.message || `Authentication failed with status ${response.status}`,
        },
        { status: response.status },
      )
    }

    // Transform response to match expected format
    return NextResponse.json({
      status: "success",
      message: "Successfully authenticated with Google",
      user: data.user,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      csrf_token: data.csrf_token,
      is_new_user: data.is_new_user || false,
    })
  } catch (error) {
    console.error("[v0] Admin Google login proxy error:", error)
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Failed to authenticate with Google",
      },
      { status: 500 },
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}
