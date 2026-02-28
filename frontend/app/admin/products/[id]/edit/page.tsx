import { EditProductClient } from "./edit-product-client"

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const id = resolvedParams.id

  // Pass the product ID to client component - it will fetch data client-side
  return <EditProductClient productId={id} />
}
