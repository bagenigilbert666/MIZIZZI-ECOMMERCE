import { EditProductClient } from "./edit-product-client"
import { getProductData } from "./server-data"
import { redirect } from "next/navigation"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditProductPage({ params }: PageProps) {
  // Awaiting params in Next.js 16 (Server-side rendering)
  const resolvedParams = await params
  const id = resolvedParams.id

  // Fetch product data server-side using proper server-side authentication
  const { product, categories, brands, images, error } = await getProductData(id)

  // Redirect if product not found or error occurred
  if (error || !product) {
    redirect("/admin/products")
  }

  // Return the client component with server-fetched data
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

