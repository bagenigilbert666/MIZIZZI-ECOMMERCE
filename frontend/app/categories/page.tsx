import type { Metadata } from "next"
import { getCategories } from "@/lib/server/get-categories"
import { CategoriesPageContent } from "@/components/categories/page-content"
import { defaultViewport } from "@/lib/metadata-utils"

export const viewport = defaultViewport

export const metadata: Metadata = {
  title: "All Categories | Mizizzi",
  description:
    "Browse all product categories at Mizizzi. Find everything from accessories and electronics to fashion and home & living.",
  openGraph: {
    title: "All Categories | Mizizzi",
    description:
      "Browse all product categories at Mizizzi. Find everything from accessories and electronics to fashion and home & living.",
  },
}

export default async function CategoriesPage() {
  // Use server-side getCategories with React cache for instant data delivery
  const categories = await getCategories(100)

  return <CategoriesPageContent categories={categories} />
}
