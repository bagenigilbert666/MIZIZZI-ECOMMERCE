import { EditProductClient } from "./edit-product-client"

async function fetchProductData(productId: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

    // Fetch all data in parallel on the server
    const [productRes, categoriesRes, brandsRes, imagesRes] = await Promise.all([
      fetch(`${baseUrl}/api/products/${productId}`, {
        next: { revalidate: 60 },
      }).catch(() => null),
      fetch(`${baseUrl}/api/shop-categories/categories?per_page=100`, {
        next: { revalidate: 300 },
      }).catch(() => null),
      fetch(`${baseUrl}/api/brands?per_page=100`, {
        next: { revalidate: 300 },
      }).catch(() => null),
      fetch(`${baseUrl}/api/products/${productId}/images`, {
        next: { revalidate: 60 },
      }).catch(() => null),
    ])

    // Parse responses with fallback to empty data
    let product = null
    let categories = []
    let brands = []
    let images = []

    if (productRes?.ok) {
      const data = await productRes.json()
      product = data.data || data
    }

    if (categoriesRes?.ok) {
      const data = await categoriesRes.json()
      categories = data.items || data.data || []
    }

    if (brandsRes?.ok) {
      const data = await brandsRes.json()
      brands = data.items || data.data || []
    }

    if (imagesRes?.ok) {
      const data = await imagesRes.json()
      images = data.items || data.data || []
    }

    return { product, categories, brands, images }
  } catch (error) {
    console.error("[v0] SSR fetch error:", error)
    return { product: null, categories: [], brands: [], images: [] }
  }
}

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const id = resolvedParams.id

  // Fetch all data on server for instant SSR
  const { product, categories, brands, images } = await fetchProductData(id)

  return (
    <EditProductClient
      productId={id}
      initialProduct={product}
      initialCategories={categories}
      initialBrands={brands}
      initialImages={images}
    />
  )
}
