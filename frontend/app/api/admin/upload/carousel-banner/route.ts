import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file is an image
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 5MB" },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const buffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(buffer)

    // Call backend API to upload to Cloudinary
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
    const uploadFormData = new FormData()
    uploadFormData.append("file", new Blob([uint8Array], { type: file.type }), file.name)

    console.log("[v0] Uploading carousel banner to Cloudinary via backend:", file.name)

    const authHeader = request.headers.get("Authorization")
    const token = authHeader?.replace("Bearer ", "") || ""

    const backendResponse = await fetch(
      `${backendUrl}/api/admin/cloudinary/upload`,
      {
        method: "POST",
        body: uploadFormData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({}))
      console.error("[v0] Backend carousel banner upload error:", errorData)
      return NextResponse.json(
        {
          error: errorData.error || "Failed to upload carousel banner",
          details: errorData,
        },
        { status: backendResponse.status }
      )
    }

    const uploadResult = await backendResponse.json()
    console.log("[v0] Carousel banner uploaded successfully:", uploadResult)

    return NextResponse.json(
      {
        success: true,
        url: uploadResult.url || uploadResult.secure_url,
        image_url: uploadResult.url || uploadResult.secure_url,
        display_url: uploadResult.url || uploadResult.secure_url,
        publicId: uploadResult.public_id,
        cloudinaryData: uploadResult,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[v0] Carousel banner upload API error:", error)
    return NextResponse.json(
      {
        error: "Failed to process upload",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
