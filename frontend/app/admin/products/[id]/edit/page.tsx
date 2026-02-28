import { EditProductClient } from "./edit-product-client"
import { productService } from "@/services/product"
import { adminService } from "@/services/admin"
import { redirect } from "next/navigation"
import type { Product } from "@/types"

interface PageProps {
  params: Promise<{ id: string }>
}

// Server-side data fetching function
async function getProductData(productId: string) {
  try {
    // Fetch product, categories, brands, and images in parallel
    const [product, categories, brands, images] = await Promise.all([
      adminService.getProduct(productId),
      adminService.getCategories(),
      adminService.getBrands(),
      adminService.getProductImages ? adminService.getProductImages(productId) : Promise.resolve([]),
    ])

    return {
      product,
      categories,
      brands,
      images: images || [],
      error: null,
    }
  } catch (error: any) {
    console.error("[v0] Error fetching product data:", error)
    return {
      product: null,
      categories: [],
      brands: [],
      images: [],
      error: error?.message || "Failed to load product",
    }
  }
}

export default async function EditProductPage({ params }: PageProps) {
  // In Next.js 16, params is a Promise that needs to be awaited
  const resolvedParams = await params
  const id = resolvedParams.id

  // Fetch all data server-side before rendering
  const { product, categories, brands, error } = await getProductData(id)

  // Redirect if product not found
  if (error || !product) {
    redirect("/admin/products")
  }

  // Pass the data to the client component
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

