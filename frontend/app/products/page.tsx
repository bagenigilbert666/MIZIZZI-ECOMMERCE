"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, X, Heart, Eye, ShoppingBag, ChevronRight, Home, ChevronUp, ChevronDown, Sparkles, SlidersHorizontal } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { productService } from "@/services/product"
import { categoryService, type Category } from "@/services/category"
import type { Product, Review } from "@/types"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useDebounce } from "@/hooks/use-debounce"
import { cn } from "@/lib/utils"
import { Loader } from "@/components/ui/loader"

export default function ProductsPage() {
  // State for products and filtering
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [sortBy, setSortBy] = useState("newest")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [productReviews, setProductReviews] = useState<Review[]>([])
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [quickViewOpen, setQuickViewOpen] = useState(false)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000])
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])
  const [wishlist, setWishlist] = useState<number[]>([])
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)

  const [showAllCategories, setShowAllCategories] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)

  const isMobile = useMediaQuery("(max-width: 768px)")
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)



  // Fetch categories - optimized with useCallback
  const fetchCategories = useCallback(async () => {
    try {
      setLoadingCategories(true)
      const fetchedCategories = await categoryService.getCategories({ parent_id: null })
      setCategories(fetchedCategories)
    } catch (err) {
      console.error("Error fetching categories:", err)
    } finally {
      setLoadingCategories(false)
    }
  }, [])

  // Fetch initial products - optimized with useCallback
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      setInitialLoading(true)

      // First, fetch all categories to ensure we have them available for filtering
      await fetchCategories()

      // Try to fetch products with explicit filtering first
      const fetchedProducts = await productService.getProducts({
        limit: 24,
      })

      console.log(`Fetched ${fetchedProducts.length} products for display`)
      setProducts(fetchedProducts)
      setFilteredProducts(fetchedProducts)
      setHasMore(fetchedProducts.length >= 24)
    } catch (err) {
      console.error("Error fetching products:", err)
      setError("Failed to load products")
    } finally {
      setLoading(false)
      setInitialLoading(false)
    }
  }, [fetchCategories])

  // Fetch product reviews
  const fetchProductReviews = useCallback(async (productId: number) => {
    if (!productId) return

    try {
      setLoadingReviews(true)
      // Instead of calling a non-existent method, we'll simulate fetching reviews
      // by using the product's existing reviews or returning an empty array
      const product = await productService.getProduct(productId.toString())
      setProductReviews(product?.reviews || [])
    } catch (err) {
      console.error("Error fetching product reviews:", err)
    } finally {
      setLoadingReviews(false)
    }
  }, [])

  // Initial data fetching
  useEffect(() => {
    fetchCategories()
    fetchProducts()

    // Load wishlist from localStorage
    const savedWishlist = localStorage.getItem("wishlist")
    if (savedWishlist) {
      try {
        setWishlist(JSON.parse(savedWishlist))
      } catch (e) {
        console.error("Error parsing wishlist from localStorage:", e)
      }
    }
  }, [fetchCategories, fetchProducts])

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    if (loadMoreRef.current && !initialLoading) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore && !loadingMore) {
            loadMoreProducts()
          }
        },
        { threshold: 0.1 },
      )

      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [hasMore, loadingMore, initialLoading])

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

  // Update the filter products effect to handle the product types properly
  // Filter products based on search, categories, and price
  useEffect(() => {
    if (loading) return

    let filtered = [...products]

    // Apply search filter
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase()
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          (product.description && product.description.toLowerCase().includes(query)) ||
          (product.category_id && product.category_id.toString().toLowerCase().includes(query)) ||
          (typeof product.category === "string" && product.category.toLowerCase().includes(query)) ||
          (product.category?.name && product.category.name.toLowerCase().includes(query)),
      )
    }

    // Apply category filters
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((product) => {
        // Ensure category_id is a number for comparison
        const categoryId =
          typeof product.category_id === "string" ? Number.parseInt(product.category_id, 10) : product.category_id

        return selectedCategories.includes(Number(categoryId))
      })
    }

    // Apply price range filter
    filtered = filtered.filter((product) => {
      // Ensure price is a number
      const productPrice =
        typeof product.sale_price === "number" && product.sale_price > 0
          ? product.sale_price
          : typeof product.price === "number"
            ? product.price
            : 0

      return productPrice >= priceRange[0] && productPrice <= priceRange[1]
    })

    // Remove this line that was filtering out flash sale and luxury deal products
    // filtered = filtered.filter((product) => !product.is_flash_sale && !product.is_luxury_deal)

    // Apply sorting
    filtered.sort((a, b) => {
      // Ensure prices are numbers
      const priceA =
        typeof a.sale_price === "number" && a.sale_price > 0 ? a.sale_price : typeof a.price === "number" ? a.price : 0

      const priceB =
        typeof b.sale_price === "number" && b.sale_price > 0 ? b.sale_price : typeof b.price === "number" ? b.price : 0

      switch (sortBy) {
        case "price-asc":
          return priceA - priceB
        case "price-desc":
          return priceB - priceA
        case "discount":
          const discountA =
            typeof a.sale_price === "number" && typeof a.price === "number" && a.sale_price < a.price
              ? (a.price - a.sale_price) / a.price
              : 0

          const discountB =
            typeof b.sale_price === "number" && typeof b.price === "number" && b.sale_price < b.price
              ? (b.price - b.sale_price) / b.price
              : 0

          return discountB - discountA
        case "newest":
        default:
          return Number(b.id) - Number(a.id)
      }
    })

    setFilteredProducts(filtered)

    // Update active filters
    const newActiveFilters: string[] = []
    if (debouncedSearchQuery) newActiveFilters.push(`Search: ${debouncedSearchQuery}`)
    if (selectedCategories.length > 0) {
      newActiveFilters.push(`Categories: ${selectedCategories.length} selected`)
    }
    if (priceRange[0] > 0 || priceRange[1] < 1000000) {
      newActiveFilters.push(`Price: KSh ${priceRange[0].toLocaleString()} - KSh ${priceRange[1].toLocaleString()}`)
    }

    setActiveFilters(newActiveFilters)
  }, [debouncedSearchQuery, products, selectedCategories, priceRange, sortBy, loading])

  // Save wishlist to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("wishlist", JSON.stringify(wishlist))
  }, [wishlist])

  // Load more products function
  const loadMoreProducts = async () => {
    if (loadingMore || !hasMore) return

    try {
      setLoadingMore(true)
      const nextPage = page + 1

      // Get more products without filtering
      const moreProducts = await productService.getProducts({
        page: nextPage,
        limit: 12,
      })

      if (moreProducts.length === 0) {
        setHasMore(false)
      } else {
        const typedProducts = moreProducts.map((product) => {
          const typedProduct: Product = {
            ...product,
            product_type: product.is_flash_sale ? "flash_sale" : product.is_luxury_deal ? "luxury" : "regular",
          }
          return typedProduct
        })

        setProducts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id))
          const newProducts = typedProducts.filter((product) => !existingIds.has(product.id))
          return [...prev, ...newProducts]
        })
        setPage(nextPage)
      }
    } catch (error) {
      console.error("Error loading more products:", error)
    } finally {
      setLoadingMore(false)
    }
  }

  // Toggle category selection
  const toggleCategory = (categoryId: number) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
    )
  }

  // Toggle wishlist
  const toggleWishlist = (productId: number, e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()

    setWishlist((prev) => (prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]))
  }

  // Open quick view modal
  const openQuickView = async (product: Product, e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()

    setSelectedProduct(product)
    setActiveImageIndex(0)
    setQuickViewOpen(true)

    // Fetch reviews for the selected product
    await fetchProductReviews(Number(product.id))
  }

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery("")
    setSelectedCategories([])
    setPriceRange([0, 1000000])
    setSortBy("newest")
  }

  // Calculate discount percentage
  const calculateDiscount = (price: number, salePrice: number | null) => {
    if (!salePrice || salePrice >= price) return 0
    return Math.round(((price - salePrice) / price) * 100)
  }

  // Calculate average rating
  const calculateAverageRating = (reviews: Review[]) => {
    if (!reviews || reviews.length === 0) return 0
    const sum = reviews.reduce((total, review) => total + review.rating, 0)
    return (sum / reviews.length).toFixed(1)
  }

  // Render error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-12">
          <div className="rounded-lg bg-white p-8 text-center shadow-sm">
            <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <h2 className="mb-2 text-lg font-semibold text-gray-900">Unable to Load Products</h2>
            <p className="mb-6 text-gray-600">{error}</p>
            <Button onClick={() => window.location.reload()} className="bg-slate-900 hover:bg-slate-800">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const categoriesToShow = showAllCategories ? categories.length : 20

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <nav className="flex items-center text-sm text-gray-600 py-3 overflow-x-auto">
            <Link href="/" className="flex items-center hover:text-gray-900 transition-colors whitespace-nowrap">
              <Home className="h-3.5 w-3.5 mr-1" />
              <span>Home</span>
            </Link>
            <ChevronRight className="h-3.5 w-3.5 mx-2 text-gray-400 flex-shrink-0" />
            <span className="font-medium text-gray-900 whitespace-nowrap">Products</span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
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
                      {categories.slice(0, categoriesToShow).map((cat) => {
                        const isSelected = selectedCategories.includes(cat.id)
                        
                        return (
                          <div key={cat.id}>
                            <button
                              onClick={() => toggleCategory(cat.id)}
                              className={`block w-full text-left text-sm py-1.5 px-2 rounded transition-colors ${
                                isSelected
                                  ? 'font-semibold text-gray-900 bg-gray-100'
                                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                              }`}
                            >
                              {cat.name}
                              {cat.products_count ? ` (${cat.products_count})` : ''}
                            </button>
                          </div>
                        )
                      })}
                      
                      {categories.length > 20 && (
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

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase">Price Range</h3>
                  <Slider
                    min={0}
                    max={1000000}
                    step={5000}
                    value={priceRange}
                    onValueChange={(value) => setPriceRange(value as [number, number])}
                    className="py-4"
                  />
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
                    <span>KSh {priceRange[0].toLocaleString()}</span>
                    <span>KSh {priceRange[1].toLocaleString()}</span>
                  </div>
                </div>

                {activeFilters.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={resetFilters} 
                    className="w-full mt-4"
                  >
                    Reset Filters
                  </Button>
                )}
              </div>
            </div>
          </aside>

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
                      Discover all products with exclusive deals, fast shipping, and a seamless shopping experience.
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

            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 sm:max-w-sm">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search products..."
                  className="pl-10 pr-4 h-10 border-gray-300 bg-white rounded-lg"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Sheet open={showFilters} onOpenChange={setShowFilters}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="lg:hidden gap-2 h-10">
                      <SlidersHorizontal className="h-4 w-4" />
                      Filters
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 bg-white">
                    <SheetHeader className="mb-6">
                      <SheetTitle>Filters</SheetTitle>
                    </SheetHeader>

                    <div className="space-y-6">
                      {/* Price range */}
                      <div>
                        <h3 className="mb-4 text-sm font-semibold text-gray-900">Price Range</h3>
                        <Slider
                          min={0}
                          max={1000000}
                          step={5000}
                          value={priceRange}
                          onValueChange={(value) => setPriceRange(value as [number, number])}
                          className="py-4"
                        />
                        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                          <span>KSh {priceRange[0].toLocaleString()}</span>
                          <span>KSh {priceRange[1].toLocaleString()}</span>
                        </div>
                      </div>

                      <Separator />

                      {/* Categories */}
                      <div>
                        <h3 className="mb-4 text-sm font-semibold text-gray-900">Categories</h3>
                        {loadingCategories ? (
                          <div className="space-y-2">
                            {[...Array(3)].map((_, i) => (
                              <div key={i} className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {categories.map((category) => (
                              <div key={category.id} className="flex items-center">
                                <input
                                  type="checkbox"
                                  id={`mobile-cat-${category.id}`}
                                  checked={selectedCategories.includes(category.id)}
                                  onChange={() => toggleCategory(category.id)}
                                  className="h-4 w-4 rounded border-gray-300 text-slate-900"
                                />
                                <label htmlFor={`mobile-cat-${category.id}`} className="ml-3 text-sm text-gray-700 cursor-pointer">
                                  {category.name}
                                </label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-3 pt-4">
                        <Button variant="outline" size="sm" onClick={resetFilters} className="flex-1">
                          Reset
                        </Button>
                        <SheetClose asChild>
                          <Button size="sm" className="flex-1 bg-slate-900 hover:bg-slate-800">
                            Apply
                          </Button>
                        </SheetClose>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            {activeFilters.length > 0 && (
              <div className="mb-6 flex flex-wrap items-center gap-2">
                {activeFilters.map((filter, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {filter}
                  </Badge>
                ))}
                <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 text-xs ml-2">
                  Clear All
                </Button>
              </div>
            )}

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              {filteredProducts.length === 0 ? (
                <div className="py-12 text-center">
                  <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">No products found</h3>
                  <p className="mb-6 text-gray-600">Try adjusting your filters or search terms</p>
                  <Button onClick={resetFilters} className="bg-slate-900 hover:bg-slate-800">
                    Reset Filters
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2 md:grid-cols-4 md:gap-3 lg:grid-cols-5 lg:gap-3 xl:grid-cols-5 xl:gap-3 2xl:grid-cols-6 2xl:gap-4">
                    {initialLoading ? (
                      <>
                        {[...Array(12)].map((_, index) => (
                          <div key={`skeleton-${index}`} className="rounded-lg bg-gray-50 p-4">
                            <div className="aspect-square bg-gray-200 rounded-md mb-3 animate-pulse" />
                            <div className="h-4 w-full bg-gray-200 rounded mb-2 animate-pulse" />
                            <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse" />
                          </div>
                        ))}
                      </>
                    ) : (
                      <>
                        {filteredProducts.map((product) => {
                          const price = typeof product.price === "number" ? product.price : 0
                          const salePrice = typeof product.sale_price === "number" ? product.sale_price : null
                          const discount = calculateDiscount(price, salePrice)

                          return (
                            <Link key={product.id} href={`/product/${product.id}`}>
                              <motion.div
                                className="group rounded-lg bg-white border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-300 overflow-hidden"
                                whileHover={{ y: -2 }}
                              >
                                {/* Product image */}
                                <div className="relative aspect-square overflow-hidden bg-gray-50">
                                  <Image
                                    src={product.image_urls?.[0] || product.thumbnail_url || "/placeholder.svg"}
                                    alt={product.name}
                                    fill
                                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                                  />

                                  {discount > 0 && (
                                    <div className="absolute top-2 left-2 bg-orange-500 text-white px-2 py-0.5 rounded text-xs font-semibold">
                                      -{discount}%
                                    </div>
                                  )}

                                  <button
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      toggleWishlist(Number(product.id))
                                    }}
                                    className="absolute top-2 right-2 p-1.5 rounded-full bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Heart
                                      className={cn(
                                        "h-4 w-4 transition-colors",
                                        wishlist.includes(Number(product.id))
                                          ? "fill-red-500 text-red-500"
                                          : "text-gray-600 hover:text-red-500"
                                      )}
                                    />
                                  </button>
                                </div>

                                {/* Product info */}
                                <div className="p-3">
                                  <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2 group-hover:text-slate-700 transition-colors">
                                    {product.name}
                                  </h3>

                                  <div className="space-y-1">
                                    {/* Price */}
                                    <div className="flex items-baseline gap-2">
                                      <span className="text-base font-bold text-gray-900">
                                        KSh {(salePrice || price).toLocaleString()}
                                      </span>
                                      {salePrice && salePrice < price && (
                                        <span className="text-xs text-gray-400 line-through">
                                          KSh {price.toLocaleString()}
                                        </span>
                                      )}
                                    </div>

                                    {/* Stock indicator */}
                                    {(product.stock ?? 0) > 0 && (product.stock ?? 0) < 5 && (
                                      <p className="text-xs text-orange-600 font-medium">
                                        Only {product.stock ?? 0} left
                                      </p>
                                    )}

                                    {(product.stock ?? 0) === 0 && (
                                      <p className="text-xs text-red-600 font-medium">Out of Stock</p>
                                    )}

                                    {(product.stock ?? 0) > 5 && (
                                      <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-600"></span>
                                        Available
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            </Link>
                          )
                        })}
                      </>
                    )}
                  </div>

                  {/* Load more trigger */}
                  {hasMore && (
                    <div ref={loadMoreRef} className="mt-8 flex justify-center py-4">
                      {loadingMore && (
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-slate-900" />
                          <span className="text-sm text-gray-600">Loading more...</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

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

      {/* Quick view modal remains the same */}
      <Dialog open={quickViewOpen} onOpenChange={setQuickViewOpen}>
        <DialogContent className="max-w-2xl p-0 bg-white rounded-lg overflow-hidden">
          {selectedProduct && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              {/* Product image */}
              <div className="bg-gray-50 p-6 flex items-center justify-center">
                <div className="relative aspect-square w-full max-w-sm">
                  <Image
                    src={selectedProduct.image_urls?.[activeImageIndex] || selectedProduct.thumbnail_url || "/placeholder.svg"}
                    alt={selectedProduct.name}
                    fill
                    className="object-cover rounded-lg"
                  />
                </div>
              </div>

              {/* Product details */}
              <div className="p-6 flex flex-col">
                <div className="mb-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Product</p>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedProduct.name}</h2>
                </div>

                <p className="text-gray-600 text-sm mb-6">{selectedProduct.description}</p>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-bold text-gray-900">
                      KSh{" "}
                      {(typeof selectedProduct.sale_price === "number" && selectedProduct.sale_price > 0
                        ? selectedProduct.sale_price
                        : selectedProduct.price
                      ).toLocaleString()}
                    </span>
                    {selectedProduct.sale_price && selectedProduct.sale_price < selectedProduct.price && (
                      <span className="text-lg text-gray-400 line-through">
                        KSh {selectedProduct.price.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                <Separator className="mb-6" />

                {/* Stock */}
                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-2">Availability</p>
                  <p className={cn("font-medium", (selectedProduct.stock ?? 0) > 0 ? "text-green-600" : "text-red-600")}>
                    {(selectedProduct.stock ?? 0) > 0 ? `${selectedProduct.stock ?? 0} in stock` : "Out of Stock"}
                  </p>
                </div>

                {/* Actions */}
                <div className="mt-auto space-y-3 flex flex-col">
                  <Link href={`/product/${selectedProduct.id}`} className="w-full">
                    <Button className="w-full bg-slate-900 hover:bg-slate-800 h-11">
                      View Full Details
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="w-full h-11"
                    onClick={() => toggleWishlist(Number(selectedProduct.id))}
                  >
                    <Heart
                      className={cn(
                        "mr-2 h-5 w-5",
                        wishlist.includes(Number(selectedProduct.id))
                          ? "fill-red-500 text-red-500"
                          : "text-gray-600"
                      )}
                    />
                    {wishlist.includes(Number(selectedProduct.id)) ? "Saved" : "Save for Later"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  )
}
