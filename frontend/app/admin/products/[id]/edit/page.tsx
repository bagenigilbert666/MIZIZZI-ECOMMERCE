import { EditProductClient } from "./edit-product-client"

// Server-side data fetching for instant initial load - with fallback to client-side
async function getProductData(productId: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
    
    // Server-side fetch doesn't require auth token for public endpoints
    // If fetch fails, we'll let the client fetch it instead
    const [productRes, categoriesRes, brandsRes, imagesRes] = await Promise.all([
      fetch(`${baseUrl}/api/admin/products/${productId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store", // Don't cache for admin endpoints
      }).catch(() => null),
      fetch(`${baseUrl}/api/admin/shop-categories/categories?per_page=100`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "revalidate",
        next: { revalidate: 300 },
      }).catch(() => null),
      fetch(`${baseUrl}/api/admin/brands?per_page=100`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "revalidate",
        next: { revalidate: 300 },
      }).catch(() => null),
      fetch(`${baseUrl}/api/admin/products/${productId}/images`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }).catch(() => null),
    ])

    // If any fetch failed, return partial data or null to let client handle it
    if (!productRes || !productRes.ok) {
      console.log("[v0] Server-side product fetch failed or unavailable, will fetch from client")
      return null // Let client handle all fetching
    }

    const product = await productRes.json().catch(() => null)
    if (!product) return null

    const categories = categoriesRes?.ok ? await categoriesRes.json().catch(() => ({ items: [] })) : { items: [] }
    const brands = brandsRes?.ok ? await brandsRes.json().catch(() => ({ items: [] })) : { items: [] }
    const images = imagesRes?.ok ? await imagesRes.json().catch(() => ({ items: [] })) : { items: [] }

    console.log("[v0] Server-side data fetching successful")

    return {
      product: product.data || product,
      categories: categories.items || [],
      brands: brands.items || [],
      images: images.items || [],
    }
  } catch (error) {
    console.log("[v0] Server-side fetch error, will use client-side fetching:", error)
    return null
  }
}

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const id = resolvedParams.id

  // Try server-side fetching first, but don't fail if it doesn't work
  const initialData = await getProductData(id)

  // Pass pre-fetched data to client component (can be null if server fetch fails)
  return (
    <EditProductClient 
      productId={id}
      initialProduct={initialData?.product}
      initialCategories={initialData?.categories}
      initialBrands={initialData?.brands}
      initialImages={initialData?.images}
    />
  )
}
