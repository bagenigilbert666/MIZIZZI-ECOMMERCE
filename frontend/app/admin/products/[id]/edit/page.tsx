import { EditProductClient } from "./edit-product-client"
import { notFound } from "next/navigation"

// Server-side data fetching for instant initial load
async function getProductData(productId: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
    const token = process.env.ADMIN_TOKEN // Use server-side token if available

    // Fetch all data in parallel on the server
    const [productRes, categoriesRes, brandsRes, imagesRes] = await Promise.all([
      fetch(`${baseUrl}/api/admin/products/${productId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        next: { revalidate: 60 }, // Cache for 60 seconds
      }),
      fetch(`${baseUrl}/api/admin/shop-categories/categories?per_page=100`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        next: { revalidate: 300 }, // Cache for 5 minutes
      }),
      fetch(`${baseUrl}/api/admin/brands?per_page=100`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        next: { revalidate: 300 }, // Cache for 5 minutes
      }),
      fetch(`${baseUrl}/api/admin/products/${productId}/images`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        next: { revalidate: 60 },
      }),
    ])

    if (!productRes.ok) {
      console.error("[v0] Product fetch failed:", productRes.status)
      return null
    }

    const product = await productRes.json()
    const categories = categoriesRes.ok ? await categoriesRes.json() : { items: [] }
    const brands = brandsRes.ok ? await brandsRes.json() : { items: [] }
    const images = imagesRes.ok ? await imagesRes.json() : { items: [] }

    return {
      product: product.data || product,
      categories: categories.items || [],
      brands: brands.items || [],
      images: images.items || [],
    }
  } catch (error) {
    console.error("[v0] Error fetching product data on server:", error)
    return null
  }
}

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const id = resolvedParams.id

  console.log("[v0] EditProductPage SSR: Fetching data for product ID:", id)

  // Fetch data on the server
  const initialData = await getProductData(id)

  if (!initialData) {
    notFound()
  }

  console.log("[v0] EditProductPage SSR: Data fetched successfully, rendering client component")

  // Pass pre-fetched data to client component
  return (
    <EditProductClient 
      productId={id}
      initialProduct={initialData.product}
      initialCategories={initialData.categories}
      initialBrands={initialData.brands}
      initialImages={initialData.images}
    />
  )
}
