import { Metadata } from "next"
import { getAllProducts } from "@/lib/server/get-all-products"
import { ProductsPageContent } from "@/components/products/products-page"

export const metadata: Metadata = {
  title: "Products | Mizizzi",
  description: "Browse our complete collection of premium products with exclusive deals and fast shipping.",
}

export default async function ProductsPage() {
  const products = await getAllProducts(100)

  return <ProductsPageContent initialProducts={products} />
}
