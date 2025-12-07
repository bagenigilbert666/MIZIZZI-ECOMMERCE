"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from 'next/navigation'
import Link from "next/link"
import { Suspense } from "react"
import { ProductGrid } from "@/components/products/product-grid"
import { Loader } from "@/components/ui/loader"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronUp, ChevronRight, Home, Search, X, SlidersHorizontal, ChevronDown, Sparkles, Zap } from 'lucide-react'
import type { Category } from "@/services/category"
import { categoryService } from "@/services/category"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface CategoryPageClientProps {
  category: Category
  subcategories: Category[]
  slug: string
  relatedCategories?: Category[]
}

export default function CategoryPageClient({
  category,
  subcategories,
  slug,
  relatedCategories = [],
}: CategoryPageClientProps): JSX.Element {
  const router = useRouter()
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [showAllCategories, setShowAllCategories] = useState(false)
  
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  
  useEffect(() => {
    const fetchAllCategories = async () => {
      try {
        setLoadingCategories(true)
        const fetchedCategories = await categoryService.getCategories()
        setAllCategories(fetchedCategories)
      } catch (error) {
        console.error("Error fetching categories for sidebar:", error)
      } finally {
        setLoadingCategories(false)
      }
    }
    
    fetchAllCategories()
  }, [])

  // Monitor scroll position for back-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const topLevelCategories = allCategories.filter(cat => !cat.parent_id)
  const currentCategoryParent = category.parent_id 
    ? allCategories.find(cat => cat.id === category.parent_id)
    : null

  const categoriesToShow = showAllCategories ? topLevelCategories.length : 20

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <nav className="flex items-center text-sm text-gray-600 py-3 overflow-x-auto">
            <Link href="/" className="flex items-center hover:text-gray-900 transition-colors whitespace-nowrap">
              <Home className="h-3.5 w-3.5 mr-1" />
              <span>Home</span>
            </Link>
            <ChevronRight className="h-3.5 w-3.5 mx-2 text-gray-400 flex-shrink-0" />
            <Link href="/categories" className="hover:text-gray-900 transition-colors whitespace-nowrap">
              Categories
            </Link>
            {currentCategoryParent && (
              <>
                <ChevronRight className="h-3.5 w-3.5 mx-2 text-gray-400 flex-shrink-0" />
                <Link href={`/category/${currentCategoryParent.slug}`} className="hover:text-gray-900 transition-colors whitespace-nowrap">
                  {currentCategoryParent.name}
                </Link>
              </>
            )}
            <ChevronRight className="h-3.5 w-3.5 mx-2 text-gray-400 flex-shrink-0" />
            <span className="font-medium text-gray-900 whitespace-nowrap">{category.name}</span>
          </nav>
        </div>
      </div>

      {/* Main content with sidebar */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Left sidebar filters - Jumia style */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 sticky top-4">
              <div className="p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase">Category</h3>
                <div className="space-y-2">
                  {loadingCategories ? (
                    <div className="space-y-2">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-6 bg-gray-100 rounded animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <>
                      {/* Show top-level categories */}
                      {topLevelCategories.slice(0, categoriesToShow).map((cat) => {
                        const isCurrentCategory = cat.id === category.id
                        const isParentOfCurrent = cat.id === category.parent_id
                        const categorySubcats = allCategories.filter(sub => sub.parent_id === cat.id)
                        
                        return (
                          <div key={cat.id}>
                            <Link 
                              href={`/category/${cat.slug}`}
                              className={`block text-sm py-1.5 px-2 rounded transition-colors ${
                                isCurrentCategory || isParentOfCurrent
                                  ? 'font-semibold text-gray-900 bg-gray-100'
                                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                              }`}
                            >
                              {cat.name}
                              {cat.products_count ? ` (${cat.products_count})` : ''}
                            </Link>
                            
                            {/* Show subcategories if this is the parent of current category */}
                            {isParentOfCurrent && categorySubcats.length > 0 && (
                              <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-100 pl-3">
                                {categorySubcats.slice(0, 6).map((subcat) => (
                                  <Link
                                    key={subcat.id}
                                    href={`/category/${subcat.slug}`}
                                    className={`block text-xs py-1 px-2 rounded transition-colors ${
                                      subcat.id === category.id
                                        ? 'font-semibold text-gray-900 bg-gray-100'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                                  >
                                    {subcat.name}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                      
                      {topLevelCategories.length > 20 && (
                        <button
                          onClick={() => setShowAllCategories(!showAllCategories)}
                          className="block text-sm text-blue-600 hover:text-blue-800 font-medium py-2 px-2 mt-2 w-full text-left transition-colors"
                        >
                          {showAllCategories ? (
                            <span className="flex items-center gap-2">
                              <ChevronUp className="h-4 w-4" />
                              See Less Categories
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <ChevronDown className="h-4 w-4" />
                              See More Categories
                            </span>
                          )}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </aside>

          {/* Main content area */}
          <div className="flex-1">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-lg p-6 mb-6 text-white overflow-hidden relative">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500 rounded-full blur-3xl"></div>
              </div>
              <motion.div
                className="relative z-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="h-5 w-5 text-cyan-400" />
                      <span className="text-sm font-medium text-cyan-300">Your Best Shopping Centre App</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold mb-3 leading-tight">
                      Shop with <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Mizizi</span>
                    </h2>
                    <p className="text-gray-300 text-lg mb-4 max-w-xl">
                      Discover {category.name.toLowerCase()} with exclusive deals, fast shipping, and a seamless shopping experience.
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center justify-center">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-lg blur opacity-20"></div>
                      <div className="relative bg-gray-900 rounded-lg p-4 border border-gray-700">
                        <Sparkles className="h-12 w-12 text-cyan-400" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Products grid */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <Suspense
                fallback={
                  <div className="flex justify-center py-12">
                    <Loader  />
                  </div>
                }
              >
                <ProductGrid category={slug} limit={24} />
              </Suspense>
            </div>
          </div>
        </div>
      </div>

      {/* Back to top button */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-8 right-8 z-40 h-12 w-12 rounded-full bg-gray-900 text-white shadow-lg flex items-center justify-center hover:bg-gray-800 transition-colors"
            onClick={scrollToTop}
            aria-label="Back to top"
          >
            <ChevronUp className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
