"use client"

import { forwardRef, useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Loader2, Clock, TrendingUp, AlertCircle } from "lucide-react"
import { imageBatchService } from "@/services/image-batch-service"

interface Product {
  id: number
  name: string
  price: number
  image: string
  category?: string | { id: number; name: string; slug?: string }
  brand?:
    | string
    | {
        id: number
        name: string
        slug?: string
        created_at?: string
        description?: string
        is_active?: boolean
        is_featured?: boolean
        logo_url?: string
        updated_at?: string
        website?: string
      }
  score?: number
  thumbnail_url?: string
  slug?: string
}

interface ProductSearchResultsProps {
  results: Product[]
  isLoading: boolean
  selectedIndex: number
  onClose: () => void
  searchTime?: number
  suggestions?: string[]
  error?: string | null
}

const ProductImageWithBatch = ({ product }: { product: Product }) => {
  const [imageUrl, setImageUrl] = useState<string>("")
  const [isLoadingImage, setIsLoadingImage] = useState(true)

  useEffect(() => {
    const loadProductImage = async () => {
      try {
        setIsLoadingImage(true)

        // First try to get cached images from batch service
        const cachedImages = imageBatchService.getCachedImages(product.id.toString())

        if (cachedImages && cachedImages.length > 0) {
          // Use the first cached image
          const firstImage = cachedImages[0]
          const imageUrl = firstImage.image_url?.startsWith("http")
            ? firstImage.image_url
            : `${process.env.NEXT_PUBLIC_BACKEND_URL || "https://mizizzi-ecommerce-1.onrender.com"}/api/uploads/product_images/${firstImage.image_url?.split("/").pop()}`

          setImageUrl(imageUrl)
          setIsLoadingImage(false)
          return
        }

        // If no cached images, try to fetch them
        const images = await imageBatchService.fetchProductImages(product.id.toString())

        if (images && images.length > 0) {
          const firstImage = images[0]
          const imageUrl = firstImage.image_url?.startsWith("http")
            ? firstImage.image_url
            : `${process.env.NEXT_PUBLIC_BACKEND_URL || "https://mizizzi-ecommerce-1.onrender.com"}/api/uploads/product_images/${firstImage.image_url?.split("/").pop()}`

          setImageUrl(imageUrl)
        } else {
          // Fallback to product's own image properties
          const fallbackUrl = product.thumbnail_url?.startsWith("http")
            ? product.thumbnail_url
            : product.image?.startsWith("http")
              ? product.image
              : product.thumbnail_url || product.image
                ? `${process.env.NEXT_PUBLIC_BACKEND_URL || "https://mizizzi-ecommerce-1.onrender.com"}/api/uploads/product_images/${(product.thumbnail_url || product.image)?.split("/").pop()}`
                : "/diverse-products-still-life.png"

          setImageUrl(fallbackUrl)
        }
      } catch (error) {
        console.error(`Error loading image for product ${product.id}:`, error)
        // Fallback to placeholder
        setImageUrl("/diverse-products-still-life.png")
      } finally {
        setIsLoadingImage(false)
      }
    }

    loadProductImage()
  }, [product.id, product.thumbnail_url, product.image])

  return (
    <div className="relative h-12 w-12 flex-none overflow-hidden rounded-md bg-gray-100">
      {isLoadingImage ? (
        <div className="flex items-center justify-center h-full w-full">
          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        </div>
      ) : (
        <Image
          src={imageUrl || "/placeholder.svg"}
          alt={product.name}
          fill
          className="object-cover"
          sizes="48px"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = "/diverse-products-still-life.png"
          }}
        />
      )}
    </div>
  )
}

export const ProductSearchResults = forwardRef<HTMLDivElement, ProductSearchResultsProps>(
  ({ results, isLoading, selectedIndex, onClose, searchTime, suggestions, error }, ref) => {
    useEffect(() => {
      if (results && results.length > 0) {
        const productIds = results.map((product) => product.id.toString())
        imageBatchService.prefetchProductImages(productIds)
      }
    }, [results])

    if (isLoading) {
      return (
        <div className="w-full">
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-4 w-4 animate-spin text-cherry-600" />
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="w-full">
          <div className="flex items-center justify-center p-4">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )
    }

    if (results.length === 0) {
      return (
        <div className="w-full">
          <div className="flex items-center justify-center p-4">
            <p className="text-sm text-gray-600">No results found</p>
          </div>
        </div>
      )
    }

    const formatSearchTime = (time: number) => {
      if (typeof time !== "number" || isNaN(time)) {
        return "0ms"
      }
      return time < 1 ? `${Math.round(time * 1000)}ms` : `${time.toFixed(2)}s`
    }

    const getBrandName = (brand: Product["brand"]): string | null => {
      if (!brand) return null
      if (typeof brand === "string") return brand
      if (typeof brand === "object" && brand.name) return brand.name
      return null
    }

    return (
      <div className="w-full" ref={ref}>
        {searchTime !== undefined && (
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {results.length} results
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatSearchTime(searchTime)}
              </span>
            </div>
          </div>
        )}

        <div className="max-h-[400px] overflow-y-auto scrollbar-hide">
          {results.map((product, index) => (
            <Link
              key={product.id}
              href={product.slug || `/product/${product.id}`}
              onClick={onClose}
              className={`block px-4 py-2.5 text-sm transition-colors border-b border-gray-100 last:border-b-0 ${
                index === selectedIndex ? "bg-orange-50 text-gray-900 font-medium" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {product.name}
            </Link>
          ))}
        </div>
      </div>
    )
  },
)

ProductSearchResults.displayName = "ProductSearchResults"
