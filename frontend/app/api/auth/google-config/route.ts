import { NextResponse } from "next/server"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://mizizzi-ecommerce-1.onrender.com"

const FALLBACK_GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""

export async function GET() {
  try {
    console.log("[v0] Fetching Google OAuth config from backend:", `${API_BASE_URL}/api/auth/google-config`)

    const response = await fetch(`${API_BASE_URL}/api/auth/google-config`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000),
    })

    console.log("[v0] Backend response status:", response.status)

    if (!response.ok) {
      console.error("[v0] Backend google-config failed:", response.status)

      if (FALLBACK_GOOGLE_CLIENT_ID) {
        console.log("[v0] Using fallback Google Client ID")
        return NextResponse.json({
          status: "success",
          configured: true,
          client_id: FALLBACK_GOOGLE_CLIENT_ID,
        })
      }

      return NextResponse.json({
        status: "error",
        configured: false,
        client_id: "",
        message: `Backend returned status ${response.status}`,
      })
    }

    const data = await response.json()
    console.log("[v0] Backend google-config response:", JSON.stringify(data))

    return NextResponse.json({
      status: "success",
      configured: true,
      client_id: data.client_id || data.clientId || FALLBACK_GOOGLE_CLIENT_ID || "",
    })
  } catch (error) {
    console.error("[v0] Google config proxy error:", error)

    if (FALLBACK_GOOGLE_CLIENT_ID) {
      console.log("[v0] Using fallback Google Client ID after error")
      return NextResponse.json({
        status: "success",
        configured: true,
        client_id: FALLBACK_GOOGLE_CLIENT_ID,
      })
    }

    return NextResponse.json({
      status: "error",
      configured: false,
      client_id: "",
      message: error instanceof Error ? error.message : "Failed to get Google config",
    })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}
