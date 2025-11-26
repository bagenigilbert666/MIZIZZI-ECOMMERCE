"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { Loader } from "@/components/ui/loader"
import { OptimizedImage } from "@/components/ui/optimized-image"
import { categoryService, type Category } from "@/services/category"
import { websocketService } from "@/services/websocket"
import { CategoryBanner } from "@/components/categories/category-banner"

interface CategoriesPageClientProps {
  allCategories: Category[]
}

export default function CategoriesPageClient({ allCategories: initialCategories }: CategoriesPageClientProps) {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--color-primary')
    const textOnPrimary = getComputedStyle(document.documentElement).getPropertyValue('--color-text-on-primary')
    console.log('[v0] Categories page - Primary color:', primaryColor)
    console.log('[v0] Categories page - Text on primary:', textOnPrimary)
  }, [])

  useEffect(() => {
    const fetchCategories = async () => {
      if (categories.length === 0) {
        setIsLoading(true)
        try {
          const allCats = await categoryService.getCategories()
          setCategories(allCats)
        } catch (error) {
          console.error("Failed to fetch categories:", error)
        } finally {
          setIsLoading(false)
        }
      }
    }

    fetchCategories()
  }, [categories.length])

  useEffect(() => {
    const handleCategoryUpdate = async () => {
      categoryService.clearCache()
      setIsLoading(true)
      try {
        const updatedCategories = await categoryService.getCategories()
        setCategories([...updatedCategories])
      } catch (error) {
        console.error("Failed to refresh categories:", error)
      } finally {
        setIsLoading(false)
      }
    }

    const unsubscribe1 = websocketService.on("category_updated", handleCategoryUpdate)
    const unsubscribe2 = websocketService.on("category_created", handleCategoryUpdate)

    return () => {
      unsubscribe1()
      unsubscribe2()
    }
  }, [])

  const filteredCategories = categories.filter(
    (category) =>
      category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (category.description && category.description.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  const handleCategoryClick = (category: Category) => {
    router.push(`/category/${category.slug}`)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
  }

  if (isLoading && categories.length === 0) {
    return (
      <div className="flex justify-center py-32">
        <Loader />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 md:px-6 py-4">
        <CategoryBanner />
      </div>

      <section className="bg-white border-b border-gray-100 py-6 md:py-8">
        <div className="container mx-auto px-4 md:px-6">
          <form onSubmit={handleSearch} className="max-w-md mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="search"
                placeholder="Search categories..."
                className="pl-12 h-12 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-0 text-base"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </form>
        </div>
      </section>

      <div className="container mx-auto px-4 md:px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Category Header - Uses dynamic theme color via CSS variables */}
          <div 
            className="rounded-t-sm mb-0"
            style={{ 
              backgroundColor: 'var(--color-primary)',
            }}
          >
            <div className="px-4 py-3">
              <h2 
                className="text-base md:text-lg font-semibold"
                style={{ 
                  color: 'var(--color-text-on-primary)',
                }}
              >
                Shop By Category
              </h2>
            </div>
          </div>

          {/* Categories Grid - White background */}
          <div className="bg-white rounded-b-sm border border-gray-200 border-t-0 p-4 md:p-6">
            {filteredCategories.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-600 text-base">
                  {searchQuery ? "No categories found matching your search" : "No categories available"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-6 lg:grid-cols-5 lg:gap-6 xl:grid-cols-6 xl:gap-6">
                {filteredCategories.map((category) => (
                  <div
                    key={category.id}
                    className="flex flex-col items-center cursor-pointer group"
                    onClick={() => handleCategoryClick(category)}
                  >
                    <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-gray-50 border border-gray-100 mb-3 transition-all duration-300 group-hover:shadow-lg group-hover:border-gray-200">
                      {category.image_url ? (
                        <OptimizedImage
                          src={category.image_url}
                          alt={category.name}
                          width={150}
                          height={150}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-50">
                          <svg
                            className="w-10 h-10 text-gray-300"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                          </svg>
                        </div>
                      )}
                    </div>

                    <h3 className="text-center font-medium text-gray-900 text-sm md:text-base leading-snug px-1 mb-1 line-clamp-2 group-hover:text-orange-600 transition-colors duration-200">
                      {category.name}
                    </h3>

                    {category.products_count && category.products_count > 0 && (
                      <span className="text-xs text-gray-500 mt-1">
                        {category.products_count.toLocaleString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
