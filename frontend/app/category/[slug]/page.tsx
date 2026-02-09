import { notFound } from "next/navigation"
import type { Metadata } from "next"
import CategoryPageClient from "./category-page-client"
import { categoryService } from "@/services/category"
import { productService } from "@/services/product"
import { defaultViewport } from "@/lib/metadata-utils"
import type { Product } from "@/types"
import type { Category } from "@/services/category"

export const viewport = defaultViewport

interface CategoryPageProps {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params

  try {
    const category = await categoryService.getCategoryBySlug(slug)

    if (!category) {
      return {
        title: "Category | Mizizzi",
        description: "Shop our premium collections at Mizizzi.",
      }
    }

    return {
      title: `${category.name} | Mizizzi`,
      description: category.description || `Shop our collection of premium ${category.name.toLowerCase()} at Mizizzi.`,
      openGraph: {
        title: `${category.name} | Mizizzi`,
        description:
          category.description || `Shop our collection of premium ${category.name.toLowerCase()} at Mizizzi.`,
        images: category.banner_url ? [category.banner_url] : undefined,
      },
    }
  } catch (error) {
    return {
      title: "Category | Mizizzi",
      description: "Shop our premium collections at Mizizzi.",
    }
  }
}

/**
 * Server Component - Hybrid Rendering Pattern (SSR)
 * 
 * Pre-fetches category and product data on server for instant display,
 * then passes to client component for interactivity.
 * ✓ Products render immediately (no flash sales loading state)
 * ✓ Better SEO (search engines see full content)
 * ✓ Interactive features on client side
 */
export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params

  try {
    // Always force refresh category to ensure we get the correct data for this slug
    const category = await categoryService.getCategoryBySlug(slug)
    console.log("[v0] CategoryPage - Fetched category:", { slug, categoryId: category?.id, categoryName: category?.name })

    if (!category) {
      notFound()
    }

    // Fetch remaining data in parallel using category.id where a number is required
    const [allCategories, products, subcategories] = await Promise.all([
      categoryService.getCategories(),
      productService.getProductsByCategory(category.id.toString()),
      categoryService.getSubcategories(category.id).catch(() => []),
    ])

    console.log("[v0] CategoryPage - Fetched products:", { categoryId: category.id, categoryName: category.name, productCount: products?.length, firstProductName: products?.[0]?.name })

    // Get recommended categories
    const recommendedCategories = await categoryService
      .getRecommendedCategories(category.id, category.name, allCategories)
      .catch(() => [])

    return (
      <CategoryPageClient
        initialCategory={category}
        initialAllCategories={allCategories}
        initialProducts={products || []}
        initialSubcategories={subcategories || []}
        initialRecommendedCategories={recommendedCategories || []}
        slug={slug}
      />
    )
  } catch (error) {
    console.error("Error loading category:", error)
    notFound()
  }
}
