import type { Metadata } from "next"
import { getCategoriesBatch } from "@/lib/server/get-ui-batch"
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
  // Use unified batch API for categories with efficient caching and parallel fetching
  const categories = await getCategoriesBatch()

  return <CategoriesPageContent categories={categories} />
}
