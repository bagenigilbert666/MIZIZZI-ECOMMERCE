"use client"

import React from "react"
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Heart,
  Share2,
  ChevronRight,
  Star,
  Check,
  Truck,
  Clock,
  ThumbsUp,
  Shield,
  Zap,
  Home,
  ArrowLeft,
  ArrowRight,
  Award,
  RefreshCw,
  Minus,
  Plus,
  ShoppingCart,
  CreditCard,
  Maximize2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  MessageSquare,
} from "lucide-react"
import { FaWhatsapp } from "react-icons/fa"
import { useCart } from "@/contexts/cart/cart-context"
import { useWishlist } from "@/contexts/wishlist/wishlist-context"
import { useToast } from "@/components/ui/use-toast"
import { formatPrice, cn } from "@/lib/utils"
import { productService } from "@/services/product"
import { inventoryService } from "@/services/inventory-service"
import { cloudinaryService } from "@/services/cloudinary-service"
import { ImageZoomModal } from "./image-zoom-modal"
import { reviewService, type Review, type ReviewSummary } from "@/services/review-service"
import { useAuth } from "@/contexts/auth/auth-context"
import { imageBatchService } from "@/services/image-batch-service"
import { Loader } from "@/components/ui/loader"

interface ProductDetailsEnhancedProps {
  product: any
}

const appleVariants = {
  fadeIn: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: 0.4,
      ease: [0.2, 0, 0.2, 1],
    },
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: 0.4,
      ease: [0.175, 0.885, 0.32, 1.275],
    },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    transition: {
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
}

// const DEFAULT_FEATURES = [...] - NO LONGER NEEDED

const ORANGE_PRIMARY = "#EA580C" // Modern orange
const ORANGE_LIGHT = "orange"

export default function ProductDetailsEnhanced({ product: initialProduct }: ProductDetailsEnhancedProps) {
  const router = useRouter()
  const { isAuthenticated, user } = useAuth()
  const { toast } = useToast()

  const [isPageLoading, setIsPageLoading] = useState(true)

  // State
  const [product, setProduct] = useState<any>(initialProduct)
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedVariant, setSelectedVariant] = useState<any>(null)
  const [quantity, setQuantity] = useState(1)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [relatedProducts, setRelatedProducts] = useState<any[]>([])
  const [isLoadingRelated, setIsLoadingRelated] = useState(true)
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([])
  const [isImageZoomModalOpen, setIsImageZoomModalOpen] = useState(false)
  const [zoomSelectedImage, setZoomSelectedImage] = useState(0)
  const [showAllReviews, setShowAllReviews] = useState(false)
  const [showCartNotification, setShowCartNotification] = useState(false)
  const [cartNotificationData, setCartNotificationData] = useState<any>(null)
  const [optimisticWishlistState, setOptimisticWishlistState] = useState<boolean | null>(null)
  const [isTogglingWishlist, setIsTogglingWishlist] = useState(false)
  const [showSpecifications, setShowSpecifications] = useState(true) // New state for showing specifications

  // Inventory state
  const [inventoryData, setInventoryData] = useState<{
    available_quantity: number
    is_in_stock: boolean
    is_low_stock: boolean
    stock_status: "in_stock" | "low_stock" | "out_of_stock"
    last_updated?: string
  } | null>({
    available_quantity: 0,
    is_in_stock: false,
    is_low_stock: false,
    stock_status: "out_of_stock",
    last_updated: undefined,
  })
  const [isLoadingInventory, setIsLoadingInventory] = useState(true)
  const [inventoryError, setInventoryError] = useState<string | null>(null)

  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null)
  const [isLoadingReviews, setIsLoadingReviews] = useState(true)
  const [reviewError, setReviewError] = useState<string | null>(null)

  // Refs
  const addToCartInProgress = useRef(false)
  const lastAddToCartTime = useRef(0)
  const imageRef = useRef<HTMLDivElement>(null)
  const reviewSectionRef = useRef<HTMLDivElement>(null)
  // removed reviewFormRef, titleInputRef, commentTextareaRef
  // const reviewFormRef = useRef<HTMLDivElement>(null)
  // const titleInputRef = useRef<HTMLInputElement>(null)
  // const commentTextareaRef = useRef<HTMLTextAreaElement>(null)

  // Contexts
  const { addToCart, items: cartItems } = useCart()
  const { isInWishlist, addToWishlist, removeProductFromWishlist } = useWishlist()
  const actualWishlistState = isInWishlist(Number(product?.id))
  const isProductInWishlist = optimisticWishlistState !== null ? optimisticWishlistState : actualWishlistState

  // Derived pricing
  const currentPrice = selectedVariant?.price ?? product?.sale_price ?? product?.price
  const originalPrice = product?.price
  const discountPercentage =
    originalPrice > currentPrice ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0

  // Helpers
  const getProductImageUrl = (p: any, index = 0, highQuality = false): string => {
    if (p?.image_urls && p.image_urls.length > index) {
      const url = p.image_urls[index]
      if (typeof url === "string" && url.startsWith("blob:")) {
        console.warn(`[v0] Blob URL detected in product image, using placeholder`)
        return "/generic-product-display.png"
      }
      if (typeof url === "string" && !url.startsWith("http")) {
        if (highQuality) {
          return cloudinaryService.generateOptimizedUrl(url, {
            width: 2048,
            height: 2048,
            quality: 100,
            format: "auto",
            crop: "fit",
          })
        }
        return cloudinaryService.generateOptimizedUrl(url)
      }
      return url
    }
    return "/generic-product-display.png"
  }

  const getProductImages = (p: any): string[] => {
    let imageUrls: string[] = []
    if (p?.image_urls) {
      if (Array.isArray(p.image_urls)) {
        if (p.image_urls.length > 0 && typeof p.image_urls[0] === "string" && p.image_urls[0].length === 1) {
          try {
            const reconstructed = p.image_urls.join("")
            const parsed = JSON.parse(reconstructed)
            if (Array.isArray(parsed)) {
              imageUrls = parsed
                .filter((u: unknown): u is string => typeof u === "string" && u.trim() !== "" && !u.startsWith("blob:"))
                .map((u: string) => (u.startsWith("http") ? u : cloudinaryService.generateOptimizedUrl(u)))
            }
          } catch {
            imageUrls = []
          }
        } else {
          imageUrls = p.image_urls
            .filter((u: string): u is string => typeof u === "string" && u.trim() !== "" && !u.startsWith("blob:"))
            .map((u: string) => (u.startsWith("http") ? u : cloudinaryService.generateOptimizedUrl(u)))
        }
      } else if (typeof p.image_urls === "string") {
        try {
          const parsed = JSON.parse(p.image_urls)
          if (Array.isArray(parsed)) {
            imageUrls = parsed
              .filter((u): u is string => typeof u === "string" && u.trim() !== "" && !u.startsWith("blob:"))
              .map((u) => (u.startsWith("http") ? u : cloudinaryService.generateOptimizedUrl(u)))
          }
        } catch {
          if (!p.image_urls.startsWith("blob:")) {
            imageUrls = [
              p.image_urls.startsWith("http") ? p.image_urls : cloudinaryService.generateOptimizedUrl(p.image_urls),
            ]
          }
        }
      }
    }
    const valid = imageUrls.filter((u): u is string => Boolean(u && typeof u === "string" && u.trim() !== ""))
    return valid.length ? valid : ["/clean-product-shot.png"]
  }

  const productImages = useMemo(() => {
    console.log("[v0] Computing productImages from product.image_urls:", product?.image_urls)
    const images = getProductImages(product)
    console.log("[v0] Computed productImages:", images.length, "images")
    return images
  }, [product])

  // Effects
  useEffect(() => {
    setProduct(initialProduct)
  }, [initialProduct])

  useEffect(() => {
    // Simulate loading for smooth experience
    const timer = setTimeout(() => {
      setIsPageLoading(false)
    }, 1500)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (optimisticWishlistState !== null && optimisticWishlistState === actualWishlistState) {
      setOptimisticWishlistState(null)
    }
  }, [actualWishlistState, optimisticWishlistState])

  const fetchInventoryData = useCallback(async () => {
    if (!product?.id) return
    setIsLoadingInventory(true)
    setInventoryError(null)
    try {
      console.log("[v0] Fetching inventory for product:", product.id)
      const summary = await inventoryService.getProductInventorySummary(Number(product.id), selectedVariant?.id)
      const available = summary.total_available_quantity ?? 0
      const stock_status: "in_stock" | "low_stock" | "out_of_stock" =
        available === 0 ? "out_of_stock" : summary.is_low_stock ? "low_stock" : "in_stock"
      setInventoryData({
        available_quantity: available,
        is_in_stock: !!summary.is_in_stock,
        is_low_stock: !!summary.is_low_stock,
        stock_status,
        last_updated: summary.items?.[0]?.last_updated,
      })
      console.log("[v0] Inventory data updated successfully:", {
        available_quantity: available,
        is_in_stock: summary.is_in_stock,
        stock_status,
      })
    } catch (error: any) {
      console.error("[v0] Inventory fetch error:", error)
      setInventoryError(error?.message || "Failed to load inventory data")
      try {
        console.log("[v0] Attempting direct inventory refresh...")
        const directCheck = await inventoryService.checkAvailability(Number(product.id), 1, selectedVariant?.id)
        setInventoryData({
          available_quantity: directCheck.available_quantity,
          is_in_stock: directCheck.is_available,
          is_low_stock: !!directCheck.is_low_stock,
          stock_status:
            directCheck.available_quantity === 0 ? "out_of_stock" : directCheck.is_low_stock ? "low_stock" : "in_stock",
        })
        console.log("[v0] Direct inventory check successful:", directCheck)
        setInventoryError(null)
      } catch (directError) {
        console.error("[v0] Direct inventory check failed:", directError)
        const fallbackStock = product?.stock || 0
        console.log("[v0] Using product.stock as fallback:", fallbackStock)
        setInventoryData({
          available_quantity: fallbackStock,
          is_in_stock: fallbackStock > 0,
          is_low_stock: fallbackStock > 0 && fallbackStock <= 5,
          stock_status: fallbackStock === 0 ? "out_of_stock" : fallbackStock <= 5 ? "low_stock" : "in_stock",
        })
        setInventoryError(null)
      }
    } finally {
      setIsLoadingInventory(false)
    }
  }, [product?.id, product?.stock, selectedVariant?.id])

  useEffect(() => {
    fetchInventoryData()
  }, [fetchInventoryData])

  useEffect(() => {
    const run = async () => {
      if (!product?.category_id) return
      setIsLoadingRelated(true)
      try {
        const products = await productService.getProductsByCategory(String(product.category_id))
        setRelatedProducts(
          products
            .filter((p: any) => p.id !== product.id)
            .sort(() => 0.5 - Math.random())
            .slice(0, 6),
        )
      } finally {
        setIsLoadingRelated(false)
      }
    }
    run()

    try {
      const recentItems = JSON.parse(localStorage.getItem("recentlyViewed") || "[]")
      const exists = recentItems.some((i: any) => i.id === product.id)
      if (!exists) {
        const updated = [
          {
            id: product.id,
            name: product.name,
            price: currentPrice,
            image: productImages[0] || "/placeholder-rhtiu.png",
            slug: product.slug || product.id,
            image_urls: productImages,
            thumbnail_url: product.thumbnail_url,
          },
          ...recentItems,
        ].slice(0, 6)
        localStorage.setItem("recentlyViewed", JSON.JSON.stringify(updated))
        setRecentlyViewed(updated)
      } else {
        setRecentlyViewed(recentItems)
      }
    } catch {}
  }, [product.id, product.category_id, product.name, currentPrice, product.slug, product.thumbnail_url, productImages])

  useEffect(() => {
    const handleProductUpdate = (event: CustomEvent) => {
      const { id, product: updatedProduct } = event.detail
      if (id === product?.id?.toString()) {
        console.log("[v0] Received product update event:", updatedProduct)
        fetchInventoryData()
      }
    }

    const handleInventoryUpdate = (event: CustomEvent) => {
      const { product_id, stock, is_low_stock } = event.detail
      if (product_id === product?.id) {
        console.log("[v0] Received inventory update event:", { product_id, stock, is_low_stock })
        setInventoryData((prev) => ({
          ...prev,
          available_quantity: stock,
          is_in_stock: stock > 0,
          is_low_stock: is_low_stock,
          stock_status: stock === 0 ? "out_of_stock" : is_low_stock ? "low_stock" : "in_stock",
          last_updated: new Date().toISOString(),
        }))
      }
    }

    window.addEventListener("product-updated", handleProductUpdate as EventListener)
    window.addEventListener("inventory-updated", handleInventoryUpdate as EventListener)

    return () => {
      window.removeEventListener("product-updated", handleProductUpdate as EventListener)
      window.removeEventListener("inventory-updated", handleInventoryUpdate as EventListener)
    }
  }, [product?.id, fetchInventoryData])

  useEffect(() => {
    const handleProductImagesUpdated = (event: CustomEvent) => {
      const { productId: updatedProductId } = event.detail || {}

      if (updatedProductId && updatedProductId.toString() === product.id.toString()) {
        console.log("[v0] Product images updated event received for product:", product.id)

        imageBatchService.invalidateCache(product.id.toString())

        fetchInventoryData()

        console.log("[v0] Refetching product data to get updated images...")
        productService
          .getProduct(product.id.toString())
          .then((updatedProduct) => {
            if (updatedProduct) {
              console.log("[v0] Product data refreshed successfully")
              console.log("[v0] New image_urls:", updatedProduct.image_urls)

              return imageBatchService.fetchProductImages(product.id.toString()).then((images: any[]) => {
                console.log("[v0] Fetched images from batch service:", images.length)
                if (images && images.length > 0) {
                  updatedProduct.image_urls = images.map((img: any) => img.url || img.image_url).filter(Boolean)
                  console.log("[v0] Updated product.image_urls with all images:", updatedProduct.image_urls)
                }
                setProduct(updatedProduct)
                setSelectedImage(0)
              })
            }
          })
          .catch((error) => {
            console.error("[v0] Error refreshing product:", error)
          })
      }
    }

    window.addEventListener("productImagesUpdated", handleProductImagesUpdated as EventListener)

    return () => {
      window.removeEventListener("productImagesUpdated", handleProductImagesUpdated as EventListener)
    }
  }, [product.id, fetchInventoryData])

  useEffect(() => {
    const fetchAllProductImages = async () => {
      try {
        console.log("[v0] Fetching all product images for product:", product.id)
        imageBatchService.invalidateCache(product.id.toString())

        const images: any[] = await imageBatchService.fetchProductImages(product.id.toString())
        console.log("[v0] Fetched product images from database:", images.length)

        if (images && images.length > 0) {
          const imageUrls = images.map((img: any) => img.url || img.image_url).filter(Boolean)
          console.log("[v0] Extracted image URLs from database:", imageUrls)

          setProduct((prev: any) => ({
            ...prev,
            image_urls: imageUrls,
          }))
        } else {
          console.log("[v0] No images found in database, clearing product images")
          setProduct((prev: any) => ({
            ...prev,
            image_urls: [],
          }))
        }
      } catch (error) {
        console.error("[v0] Error fetching product images:", error)
        setProduct((prev: any) => ({
          ...prev,
          image_urls: [],
        }))
      }
    }

    if (product?.id) {
      fetchAllProductImages()
    }
  }, [product?.id])

  // Actions
  const handleVariantSelection = (variant: any) => setSelectedVariant(variant)
  const handleImageClick = () => {
    setZoomSelectedImage(selectedImage)
    setIsImageZoomModalOpen(true)
  }

  // Removed handleToggleReviewForm, handleSubmitReview
  // const handleToggleReviewForm = useCallback(() => {
  //   setShowReviewForm((prev) => !prev)
  // }, [])

  const StarRating = ({
    rating,
    onRatingChange,
    interactive = false,
    size = 20,
  }: {
    rating: number
    onRatingChange?: (rating: number) => void
    interactive?: boolean
    size?: number
  }) => {
    const [hoverRating, setHoverRating] = useState(0)

    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <motion.button
            key={star}
            onClick={() => interactive && onRatingChange?.(star)}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            className={cn(
              "transition",
              interactive && "cursor-pointer",
              (hoverRating || rating) >= star ? "text-yellow-400" : "text-gray-300",
            )}
            disabled={!interactive}
            whileHover={interactive ? { scale: 1.1 } : undefined}
          >
            <Star size={size} fill={(hoverRating || rating) >= star ? "currentColor" : "none"} className="transition" />
          </motion.button>
        ))}
      </div>
    )
  }

  const fetchReviews = useCallback(async () => {
    if (!product?.id) return
    setIsLoadingReviews(true)
    setReviewError(null)
    try {
      console.log("[v0] Fetching reviews for product:", product.id)
      const [reviewsResponse, summaryResponse] = await Promise.all([
        reviewService.getProductReviews(Number(product.id), {
          page: 1,
          per_page: showAllReviews ? 50 : 3,
          sort_by: "created_at",
          sort_order: "desc",
        }),
        reviewService.getProductReviewSummary(Number(product.id)),
      ])
      setReviews(reviewsResponse.items)
      setReviewSummary(summaryResponse)
      console.log("[v0] Reviews loaded successfully:", {
        count: reviewsResponse.items.length,
        average: summaryResponse.average_rating,
      })
      // Removed canUserReview and related logic as reviews are read-only here
      // if (isAuthenticated && user) {
      //   try {
      //     const canReview = await reviewService.canUserReviewProduct(Number(product.id))
      //     setCanUserReview(canReview)
      //   } catch (error) {
      //     console.log("[v0] Could not check review eligibility:", error)
      //     setCanUserReview(false)
      //   }
      // } else {
      //   setCanUserReview(false)
      // }
    } catch (error: any) {
      console.error("[v0] Error fetching reviews:", error)
      setReviewError(error?.message || "Failed to load reviews")
      setReviews([])
      setReviewSummary({
        total_reviews: 0,
        average_rating: 0,
        verified_reviews: 0,
        rating_distribution: { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 },
      })
    } finally {
      setIsLoadingReviews(false)
    }
  }, [product?.id, showAllReviews]) // Removed isAuthenticated, user

  useEffect(() => {
    console.log("[v0] Product changed, fetching reviews for:", product?.id)
    if (product?.id) {
      fetchReviews()
    }
  }, [fetchReviews, product?.id])

  // Removed handleSubmitReview
  // const handleSubmitReview = async () => {
  //   if (!product?.id || !reviewFormData.rating || !reviewFormData.comment.trim()) {
  //     toast({
  //       title: "Validation Error",
  //       description: "Please provide a rating and comment",
  //       variant: "destructive",
  //     })
  //     return
  //   }
  //   if (reviewFormData.comment.length < 10) {
  //     toast({
  //       title: "Validation Error",
  //       description: "Comment must be at least 10 characters long",
  //       variant: "destructive",
  //     })
  //     return
  //   }
  //   setIsSubmittingReview(true)
  //   try {
  //     console.log("[v0] Submitting review:", reviewFormData)
  //     const reviewData: CreateReviewData = {
  //       rating: reviewFormData.rating,
  //       title: reviewFormData.title.trim() || undefined,
  //       comment: reviewFormData.comment.trim(),
  //     }
  //     await reviewService.createReview(Number(product.id), reviewData)
  //     toast({
  //       title: "Review Submitted",
  //       description: "Thank you for your review!",
  //     })
  //     setReviewFormData({ rating: 0, title: "", comment: "" })
  //     setShowReviewForm(false)
  //     setCanUserReview(false)
  //     await fetchReviews()
  //   } catch (error: any) {
  //     console.error("[v0] Error submitting review:", error)
  //     toast({
  //       title: "Error",
  //       description: error?.message || "Failed to submit review",
  //       variant: "destructive",
  //     })
  //   } finally {
  //     setIsSubmittingReview(false)
  //   }
  // }

  const handleMarkHelpful = async (reviewId: number) => {
    try {
      await reviewService.markReviewHelpful(reviewId)
      // Removed toast message for successful helpful marking
      // toast({
      //   description: "Thank you for your feedback!",
      // })
      await fetchReviews()
    } catch (error: any) {
      console.error("[v0] Error marking review helpful:", error)
      toast({
        title: "Error",
        description: error?.message || "Failed to mark review as helpful",
        variant: "destructive",
      })
    }
  }

  const handleAddToCart = async (): Promise<boolean> => {
    if (!inventoryData?.is_in_stock) {
      toast({ title: "Out of Stock", description: "This product is currently out of stock", variant: "destructive" })
      return false
    }
    try {
      const fresh = await inventoryService.checkAvailability(Number(product.id), quantity, selectedVariant?.id)
      if (!fresh.is_available || quantity > fresh.available_quantity) {
        setInventoryData({
          available_quantity: fresh.available_quantity,
          is_in_stock: fresh.available_quantity > 0,
          is_low_stock: !!fresh.is_low_stock,
          stock_status: fresh.available_quantity === 0 ? "out_of_stock" : fresh.is_low_stock ? "low_stock" : "in_stock",
        })
        toast({
          title: "Stock Updated",
          description:
            fresh.available_quantity === 0
              ? "This item just went out of stock."
              : `Only ${fresh.available_quantity} items available`,
          variant: "destructive",
        })
        return false
      }
    } catch {}
    if (quantity > (inventoryData?.available_quantity ?? 0)) {
      toast({
        title: "Insufficient Stock",
        description: `Only ${inventoryData?.available_quantity ?? 0} items available`,
        variant: "destructive",
      })
      return false
    }
    if (addToCartInProgress.current || isAddingToCart) return false
    const now = Date.now()
    if (now - lastAddToCartTime.current < 1200) return false
    if ((product.variants?.length ?? 0) > 0 && !selectedVariant) {
      toast({
        title: "Select Options",
        description: "Please choose the required product options before adding to cart",
        variant: "destructive",
      })
      return false
    }
    if (quantity <= 0) {
      toast({ title: "Invalid quantity", description: "Please select at least 1 item", variant: "destructive" })
      return false
    }
    try {
      addToCartInProgress.current = true
      lastAddToCartTime.current = now
      setIsAddingToCart(true)
      const productId = typeof product.id === "string" ? Number.parseInt(product.id, 10) : product.id
      const result = await addToCart(
        productId,
        quantity,
        typeof selectedVariant?.id === "number" ? selectedVariant.id : undefined,
      )
      if (result.success) {
        await fetchInventoryData()
        setCartNotificationData({
          name: product.name,
          price: currentPrice,
          quantity,
          thumbnail_url: productImages[0] || "/shopping-cart-thumbnail.png",
        })
        setShowCartNotification(true)
        setTimeout(() => setShowCartNotification(false), 4500)
        return true
      } else {
        toast({ title: "Error", description: result.message || "Failed to add item to cart", variant: "destructive" })
        return false
      }
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to add to cart", variant: "destructive" })
      return false
    } finally {
      setTimeout(() => {
        addToCartInProgress.current = false
        setIsAddingToCart(false)
      }, 1200)
    }
  }

  const handleToggleWishlist = async () => {
    // Prevent multiple simultaneous clicks
    if (isTogglingWishlist) return

    try {
      setIsTogglingWishlist(true)

      // Optimistic update - immediately update UI
      const newState = !isProductInWishlist
      setOptimisticWishlistState(newState)

      if (isProductInWishlist) {
        await removeProductFromWishlist(Number(product.id))
      } else {
        await addToWishlist({ product_id: Number(product.id) })
      }

      // Success - the context will handle the toast notification
    } catch (error: any) {
      // Revert optimistic update on error
      setOptimisticWishlistState(null)

      console.error("[v0] Error toggling wishlist:", error)

      // Only show error toast if the context didn't already handle it
      if (!error.message?.includes("already")) {
        toast({
          title: "Error",
          description: "Failed to update wishlist. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      // Add a small delay before allowing next click to prevent rapid clicking
      setTimeout(() => {
        setIsTogglingWishlist(false)
      }, 500)
    }
  }

  const handleShare = () => {
    const url = typeof window !== "undefined" ? window.location.href : ""
    if ((navigator as any).share) {
      ;(navigator as any).share({ title: product.name, text: product.description, url }).catch(() => {})
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url)
      toast({ title: "Link copied", description: "Product link copied to clipboard" })
    }
  }

  const getProductSpecifications = (p: any) => {
    console.log("[v0] Getting specifications for product:", p?.id)
    console.log("[v0] Product specifications data:", p?.specifications)

    if (p?.specifications) {
      // Handle if specifications is a JSON string
      let specs = p.specifications
      if (typeof specs === "string") {
        try {
          specs = JSON.parse(specs)
        } catch (e) {
          console.error("[v0] Failed to parse specifications JSON:", e)
        }
      }

      if (Array.isArray(specs) && specs.length > 0) {
        console.log("[v0] Using array specifications from database:", specs.length, "categories")
        return specs.map((spec: any) => ({
          category: spec.category || "Specifications",
          items: Array.isArray(spec.items)
            ? spec.items.map((item: any) => ({
                label: item.label || "",
                value: typeof item.value === "string" ? item.value : String(item.value || ""),
              }))
            : [],
        }))
      }

      if (typeof specs === "object" && !Array.isArray(specs)) {
        console.log("[v0] Using categorized specifications from database")
        const categorizedSpecs: Array<{ category: string; items: Array<{ label: string; value: string }> }> = []

        // Process each category from the admin data
        const categoryOrder = ["product_identification", "specifications", "what's_in_the_box", "options"]

        categoryOrder.forEach((categoryKey) => {
          const categoryData = specs[categoryKey]
          if (categoryData && typeof categoryData === "object") {
            // Format category name for display
            const displayName = categoryKey
              .split("_")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ")

            const items: Array<{ label: string; value: string }> = []
            Object.entries(categoryData).forEach(([key, value]) => {
              const fieldName = key
                .split("_")
                .map((word, i) => (i === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
                .join(" ")

              if (value && typeof value === "string") {
                items.push({ label: fieldName, value })
              }
            })

            if (items.length > 0) {
              categorizedSpecs.push({
                category: displayName,
                items,
              })
            }
          }
        })

        // If we found specifications, return them
        if (categorizedSpecs.length > 0) {
          console.log("[v0] Returning", categorizedSpecs.length, "specification categories from admin data")
          return categorizedSpecs
        }
      }
    }

    // Build minimal specs from product fields only (no hardcoded defaults)
    console.log("[v0] No admin specifications found, generating minimal fallback from product fields")

    const specs: Array<{ category: string; items: Array<{ label: string; value: string }> }> = []

    // Product Identification - only include if data exists
    const identificationItems: Array<{ label: string; value: string }> = []
    if (p?.brand?.name) identificationItems.push({ label: "Brand", value: p.brand.name })
    if (p?.name) identificationItems.push({ label: "Model", value: p.name })
    if (p?.sku) identificationItems.push({ label: "SKU", value: p.sku })

    if (identificationItems.length > 0) {
      specs.push({
        category: "Product Identification",
        items: identificationItems,
      })
    }

    // Specifications - only include actual product fields
    const physicalItems: Array<{ label: string; value: string }> = []
    if (p?.weight) physicalItems.push({ label: "Weight", value: `${p.weight}kg` })
    if (p?.dimensions) {
      if (typeof p.dimensions === "object" && p.dimensions !== null) {
        const { height, length, width } = p.dimensions as any
        if (height && length && width) {
          physicalItems.push({ label: "Dimensions", value: `${length}L × ${width}W × ${height}H cm` })
        }
      } else if (typeof p.dimensions === "string" && p.dimensions) {
        physicalItems.push({ label: "Dimensions", value: p.dimensions })
      }
    }
    if (p?.material) physicalItems.push({ label: "Material", value: p.material })
    if (p?.color) physicalItems.push({ label: "Color", value: p.color })

    if (physicalItems.length > 0) {
      specs.push({ category: "Specifications", items: physicalItems })
    }

    // Package Contents - only if product has it
    const packageItems: Array<{ label: string; value: string }> = []
    if (p?.package_contents && Array.isArray(p.package_contents)) {
      p.package_contents.forEach((item: string, idx: number) => {
        packageItems.push({ label: `Item ${idx + 1}`, value: item })
      })
    }

    if (packageItems.length > 0) {
      specs.push({ category: "What's in the Box", items: packageItems })
    }

    // Available Options & Variants - only if variants exist
    if (p?.variants && p.variants.length) {
      const colors = [...new Set(p.variants.map((v: any) => v.color).filter(Boolean))]
      const sizes = [...new Set(p.variants.map((v: any) => v.size).filter(Boolean))]
      const variantItems: Array<{ label: string; value: string }> = []
      if (colors.length) variantItems.push({ label: "Available Colors", value: colors.join(", ") })
      if (sizes.length) variantItems.push({ label: "Available Sizes", value: sizes.join(", ") })
      if (variantItems.length) specs.push({ category: "Available Options", items: variantItems })
    }

    return specs
  }
  const specifications = getProductSpecifications(product)

  const calculateAverageRating = () => {
    return reviewSummary?.average_rating || 0
  }

  const stockDisplay = (() => {
    if (isLoadingInventory)
      return {
        icon: Info,
        text: "Checking availability...",
        cls: "text-gray-500 bg-gray-50 border-gray-200",
        ic: "text-gray-500",
      }
    if (inventoryError)
      return {
        icon: AlertTriangle,
        text: "Unable to check stock",
        cls: "text-orange-600 bg-orange-50 border-orange-200",
        ic: "text-orange-600",
      }
    if (!inventoryData)
      return {
        icon: XCircle,
        text: "Stock information unavailable",
        cls: "text-gray-500 bg-gray-50 border-gray-200",
        ic: "text-gray-500",
      }
    switch (inventoryData.stock_status) {
      case "in_stock":
        return {
          icon: CheckCircle,
          text: `${inventoryData.available_quantity} in stock`,
          cls: "text-green-600 bg-green-50 border-green-200",
          ic: "text-green-600",
        }
      case "low_stock":
        return {
          icon: AlertTriangle,
          text: `Only ${inventoryData.available_quantity} left`,
          cls: "text-orange-600 bg-orange-50 border-orange-200",
          ic: "text-orange-600",
        }
      case "out_of_stock":
        return { icon: XCircle, text: "Out of stock", cls: "text-red-600 bg-red-50 border-red-200", ic: "text-red-600" }
      default:
        return {
          icon: Info,
          text: "Stock status unknown",
          cls: "text-gray-500 bg-gray-50 border-gray-200",
          ic: "text-gray-500",
        }
    }
  })()

  const LuxuryPill = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold", className)}>
      {children}
    </span>
  )

  const SectionCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ children, className = "", ...props }, ref) => (
      <div
        {...props}
        ref={ref}
        className={cn("bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden", className)}
      >
        {children}
      </div>
    ),
  )

  const handleBuyViaWhatsApp = () => {
    const whatsappNumber = "254746741719" // Updated WhatsApp number with country code
    const message = encodeURIComponent(
      `I'm interested in buying ${product.name}. Price: ${formatPrice(currentPrice)}. Quantity: ${quantity}. Please assist me with the purchase.`,
    )
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, "_blank")
  }

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  if (isPageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Loader />
        <p className="mt-4 text-sm text-gray-600">Loading product details...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cart Toast - updated color scheme to orange */}
      <AnimatePresence>
        {showCartNotification && cartNotificationData && (
          <motion.div
            {...appleVariants.scaleIn}
            exit={{ opacity: 0, scale: 0.95, y: 24 }}
            className="fixed bottom-6 right-6 z-50 max-w-sm"
            role="status"
            aria-live="polite"
          >
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-xl overflow-hidden border border-gray-100">
                  <Image
                    src={cartNotificationData?.thumbnail_url || "/placeholder.svg?height=56&width=56&query=thumb"}
                    alt={cartNotificationData?.name || "Product"}
                    width={56}
                    height={56}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm line-clamp-2">{cartNotificationData?.name}</p>
                  <div className="flex items-center gap-2 text-sm mt-1">
                    <span className="font-semibold text-orange-600">
                      {formatPrice(cartNotificationData?.price || 0)}
                    </span>
                    <span className="text-gray-500">Qty: {cartNotificationData?.quantity || 1}</span>
                  </div>
                </div>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCartNotification(false)}
                  className="flex-1 h-10 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition"
                >
                  Continue
                </button>
                <Link href="/cart" className="flex-1">
                  <button className="w-full h-10 rounded-xl bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 transition">
                    View Cart ({cartItems.length})
                  </button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Breadcrumbs - orange color */}
      <motion.div {...appleVariants.fadeIn} className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center text-sm text-gray-500" aria-label="Breadcrumb">
            <Link href="/" className="flex items-center hover:text-orange-600 font-medium">
              <Home className="mr-1.5 h-4 w-4" />
              Home
            </Link>
            <ChevronRight className="mx-2 h-4 w-4 text-gray-400" />
            <Link href="/products" className="hover:text-orange-600 font-medium">
              Products
            </Link>
            <ChevronRight className="mx-2 h-4 w-4 text-gray-400" />
            <span className="text-gray-900 font-medium truncate">{product?.name}</span>
          </nav>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT: Gallery + Details */}
          <motion.div {...appleVariants.fadeIn} className="lg:col-span-7 space-y-8">
            <SectionCard>
              {/* Seller header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative w-12 h-12 rounded-xl border border-gray-100 p-2 bg-white">
                      <Image
                        src="/logo.png"
                        alt="Mizizzi Logo"
                        fill
                        sizes="48px"
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <LuxuryPill className="bg-orange-50 border-orange-200 text-orange-700">
                          <Shield className="w-4 h-4 mr-1" />
                          Official Store
                        </LuxuryPill>
                        {product?.is_luxury_deal && (
                          <LuxuryPill className="bg-purple-50 border-purple-200 text-purple-700">
                            <Award className="w-4 h-4 mr-1" />
                            Premium
                          </LuxuryPill>
                        )}
                        {product?.is_flash_sale && (
                          <LuxuryPill className="bg-amber-50 border-amber-200 text-amber-700">
                            <Zap className="w-4 h-4 mr-1" />
                            Flash Sale
                          </LuxuryPill>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-2 flex items-center gap-2">
                        <span className="font-semibold">Verified Seller</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                        <span className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-semibold">{product?.rating || 4.7}</span>
                          <span className="text-gray-400">({product?.reviews?.length || 24})</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.button
                      aria-label={isProductInWishlist ? "Remove from wishlist" : "Add to wishlist"}
                      onClick={handleToggleWishlist}
                      disabled={isTogglingWishlist}
                      className={cn(
                        "relative p-2.5 rounded-full transition-all duration-300",
                        isTogglingWishlist && "opacity-50 cursor-not-allowed",
                        isProductInWishlist
                          ? "text-orange-600 bg-orange-100/50 hover:bg-orange-100 shadow-sm"
                          : "text-gray-400 hover:text-orange-600 hover:bg-orange-50",
                      )}
                      whileHover={!isTogglingWishlist ? { scale: 1.15 } : {}}
                      whileTap={!isTogglingWishlist ? { scale: 0.9 } : {}}
                    >
                      <Heart
                        className={cn("h-5 w-5 transition-all duration-300", isProductInWishlist && "fill-orange-600")}
                      />
                    </motion.button>
                    <motion.button
                      aria-label="Share product"
                      onClick={handleShare}
                      className="p-2 rounded-full text-gray-500 hover:text-orange-600 hover:bg-orange-50 transition"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Share2 className="h-5 w-5" />
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Gallery */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Thumbnails */}
                  <div className="hidden md:block md:col-span-2">
                    <div className="space-y-3">
                      {productImages.map((img, i) => (
                        <motion.button
                          key={i}
                          className={cn(
                            "relative w-full aspect-square rounded-xl overflow-hidden border-2 transition",
                            selectedImage === i ? "border-orange-500" : "border-gray-200 hover:border-orange-300",
                          )}
                          onClick={() => setSelectedImage(i)}
                          aria-label={`Thumbnail ${i + 1}`}
                          whileHover={{ scale: 1.05, boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Image
                            src={img || "/placeholder.svg?height=100&width=100&query=thumb"}
                            alt={`${product?.name} thumbnail ${i + 1}`}
                            fill
                            sizes="100px"
                            className="object-cover w-full h-full"
                          />
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Main image */}
                  <div className="md:col-span-10">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5 }}
                      className="relative border border-gray-100 rounded-2xl overflow-hidden bg-white group cursor-zoom-in aspect-[4/3]"
                      ref={imageRef}
                      onClick={handleImageClick}
                    >
                      <Image
                        src={
                          getProductImageUrl(product, selectedImage) ||
                          "/placeholder.svg?height=600&width=800&query=main" ||
                          "/placeholder.svg" ||
                          "/placeholder.svg" ||
                          "/placeholder.svg" ||
                          "/placeholder.svg" ||
                          "/placeholder.svg" ||
                          "/placeholder.svg" ||
                          "/placeholder.svg" ||
                          "/placeholder.svg" ||
                          "/placeholder.svg" ||
                          "/placeholder.svg" ||
                          "/placeholder.svg" ||
                          "/placeholder.svg" ||
                          "/placeholder.svg" ||
                          "/placeholder.svg" ||
                          "/placeholder.svg" ||
                          "/placeholder.svg" ||
                          "/placeholder.svg" ||
                          "/placeholder.svg" ||
                          "/placeholder.svg" ||
                          "/placeholder.svg" ||
                          "/placeholder.svg"
                        }
                        alt={product?.name || "Product image"}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 65vw, 60vw"
                        className="object-contain w-full h-full transition-transform duration-300 group-hover:scale-[1.02]"
                        priority
                      />
                      {productImages.length > 1 && (
                        <>
                          <motion.button
                            aria-label="Previous image"
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 border border-gray-200 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedImage((prev) => (prev === 0 ? productImages.length - 1 : prev - 1))
                            }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <ArrowLeft className="h-5 w-5 text-gray-700" />
                          </motion.button>
                          <motion.button
                            aria-label="Next image"
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 border border-gray-200 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedImage((prev) => (prev === productImages.length - 1 ? 0 : prev + 1))
                            }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <ArrowRight className="h-5 w-5 text-gray-700" />
                          </motion.button>
                        </>
                      )}
                      {discountPercentage > 0 && (
                        <div className="absolute top-4 left-4 bg-orange-600 text-white text-sm font-semibold px-3 py-1 rounded-full">
                          -{discountPercentage}%
                        </div>
                      )}
                      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition bg-black/70 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1">
                        <Maximize2 className="h-4 w-4" />
                        Zoom
                      </div>
                    </motion.div>

                    {/* Mobile thumbnails */}
                    <div className="md:hidden mt-4">
                      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
                        {productImages.map((img, i) => (
                          <motion.button
                            key={i}
                            className={cn(
                              "relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden border-2 transition snap-start",
                              selectedImage === i ? "border-orange-500" : "border-gray-200 hover:border-orange-300",
                            )}
                            onClick={() => setSelectedImage(i)}
                            aria-label={`Thumbnail ${i + 1}`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Image
                              src={img || "/placeholder.svg?height=80&width=80&query=thumb"}
                              alt={`Thumbnail ${i + 1}`}
                              fill
                              sizes="80px"
                              className="object-cover w-full h-full"
                            />
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* Product Highlights - improved with real features and better formatting */}
            {product?.features && product.features.length > 0 && (
              <SectionCard>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-1 w-1.5 bg-orange-600 rounded-full"></div>
                    <h2 className="text-xl font-semibold text-gray-900">Key Highlights</h2>
                  </div>
                  <ul className="space-y-3">
                    {product.features.map((f: string, i: number) => (
                      <motion.li
                        key={i}
                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-orange-50/50 transition"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <Check className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-700">{f}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </SectionCard>
            )}

            {/* Product Details */}
            <SectionCard>
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Product Details</h2>
                <div
                  className="rich-product-description space-y-6"
                  dangerouslySetInnerHTML={{
                    __html:
                      product?.description ||
                      '<p class="text-gray-500 italic">No description available for this product.</p>',
                  }}
                />
              </div>
            </SectionCard>

            {/* Specifications */}
            {showSpecifications && (
              <SectionCard>
                <div className="p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Product Details</h2>
                  <div className="space-y-6">
                    {specifications.map((spec, i) => (
                      <div
                        key={i}
                        className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-sm transition-shadow"
                      >
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-3">
                          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">{spec.category}</h3>
                        </div>
                        <div className="divide-y divide-gray-100">
                          {spec.items.map((it, idx) => (
                            <div
                              key={idx}
                              className="px-6 py-3 flex justify-between items-center hover:bg-gray-50 transition-colors"
                            >
                              <span className="text-sm font-semibold text-gray-700 min-w-[40%]">{it.label}</span>
                              <span className="text-sm text-gray-600 text-right flex-1 ml-4">{String(it.value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </SectionCard>
            )}

            {/* Reviews */}
            <SectionCard id="reviews" ref={reviewSectionRef}>
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Customer Reviews</h2>
                    <div className="p-4 border border-gray-100 rounded-2xl bg-gray-50">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="text-3xl font-bold text-gray-900">
                          {isLoadingReviews ? "..." : reviewSummary?.average_rating?.toFixed(1) || "0.0"}
                        </div>
                        <div className="flex-1">
                          <StarRating rating={calculateAverageRating()} size={16} />
                          <p className="text-sm text-gray-500 mt-1">
                            Based on {isLoadingReviews ? "..." : reviewSummary?.total_reviews || 0} reviews
                          </p>
                        </div>
                      </div>
                      {/* Removed write review button */}
                      {/* {isAuthenticated && canUserReview ? (
                        <motion.button
                          onClick={handleToggleReviewForm}
                          className="w-full h-10 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          Write a Review
                        </motion.button>
                      ) : (
                        <p className="text-sm text-gray-500 text-center">
                          {!isAuthenticated ? "Sign in to write a review" : "You cannot review this product"}
                        </p>
                      )} */}
                    </div>
                  </motion.div>

                  <div className="lg:col-span-2">
                    {isLoadingReviews ? (
                      <div className="text-center py-12">
                        <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
                        </div>
                        <p className="text-sm text-gray-500">Loading reviews...</p>
                      </div>
                    ) : reviewError ? (
                      <div className="text-center py-12">
                        <div className="w-12 h-12 mx-auto mb-4 bg-red-50 rounded-full flex items-center justify-center">
                          <AlertTriangle className="h-6 w-6 text-red-600" />
                        </div>
                        <h3 className="text-base font-semibold text-gray-900 mb-2">Failed to load reviews</h3>
                        <p className="text-sm text-gray-500 mb-4">{reviewError}</p>
                        <button
                          onClick={fetchReviews}
                          className="px-4 h-10 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition"
                        >
                          Try Again
                        </button>
                      </div>
                    ) : reviews.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                          <MessageSquare className="h-6 w-6 text-gray-400" />
                        </div>
                        <h3 className="text-base font-semibold text-gray-900 mb-2">No reviews yet</h3>
                        <p className="text-sm text-gray-500">
                          Be the first to review this product in your account reviews section!
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                          {reviews.slice(0, showAllReviews ? undefined : 6).map((review, idx) => (
                            <motion.div
                              key={review.id}
                              className="border border-gray-200 p-5 rounded-xl bg-white hover:border-rose-200 hover:shadow-sm transition-all"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.08 }}
                            >
                              {/* Reviewer Info Header */}
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3 flex-1">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-100 to-rose-50 flex items-center justify-center flex-shrink-0">
                                    <span className="font-semibold text-rose-600 text-sm">
                                      {review.user?.name
                                        ? review.user.name.charAt(0).toUpperCase()
                                        : review.user?.first_name
                                          ? review.user.first_name.charAt(0).toUpperCase()
                                          : "U"}
                                    </span>
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-semibold text-gray-900 text-sm truncate">
                                        {review.user?.name || review.user?.first_name || "Anonymous User"}
                                      </span>
                                      {review.is_verified_purchase && (
                                        <span className="inline-flex items-center px-2 py-0.5 text-green-600 border border-green-200 bg-green-50 text-xs font-semibold rounded-full flex-shrink-0">
                                          <Check className="h-3 w-3 mr-1" />
                                          Verified
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-xs text-gray-500 mt-0.5">
                                      {review.created_at
                                        ? new Date(review.created_at).toLocaleDateString("en-US", {
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                          })
                                        : ""}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Star Rating */}
                              <div className="mb-3">
                                <StarRating rating={review.rating} size={16} />
                              </div>

                              {/* Review Title */}
                              {review.title && (
                                <h4 className="font-semibold text-gray-900 mb-2 text-sm line-clamp-2">
                                  {review.title}
                                </h4>
                              )}

                              {/* Review Comment */}
                              <p className="text-sm text-gray-700 mb-4 line-clamp-3 leading-relaxed">
                                {review.comment}
                              </p>

                              {/* Helpful Button */}
                              <motion.button
                                onClick={() => handleMarkHelpful(review.id)}
                                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-rose-600 font-medium transition"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <ThumbsUp className="h-4 w-4" />
                                <span>Helpful ({review.likes_count || 0})</span>
                              </motion.button>
                            </motion.div>
                          ))}
                        </div>

                        {reviews.length > 6 && (
                          <div className="flex justify-center mb-6">
                            <motion.button
                              className="px-6 h-10 rounded-lg border border-rose-600 text-rose-600 text-sm font-semibold hover:bg-rose-50 transition"
                              onClick={() => setShowAllReviews((s) => !s)}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              {showAllReviews ? "Show Less" : `Show All ${reviews.length} Reviews`}
                            </motion.button>
                          </div>
                        )}

                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-900 font-medium">
                            Want to share your experience? Write a review in your{" "}
                            <Link href="/account/reviews" className="underline font-semibold hover:text-blue-700">
                              account reviews section
                            </Link>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* Recently Viewed */}
            {!!recentlyViewed.length && (
              <SectionCard>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Recently Viewed</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {recentlyViewed.map((item, i) => (
                      <motion.div
                        key={item.id || i}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <Link href={`/product/${item.slug || item.id}`} className="group">
                          <div className="relative aspect-square rounded-xl overflow-hidden border border-gray-100">
                            <Image
                              src={
                                item.image || item.thumbnail_url || "/placeholder.svg?height=200&width=200&query=recent"
                              }
                              alt={item.name}
                              fill
                              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                              className="object-cover w-full h-full group-hover:scale-105 transition duration-300"
                            />
                          </div>
                          <h4 className="text-sm font-semibold text-gray-900 mt-2 line-clamp-2 group-hover:text-rose-600 transition">
                            {item.name}
                          </h4>
                          <p className="text-sm font-semibold text-rose-600 mt-1">{formatPrice(item.price)}</p>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </SectionCard>
            )}

            {/* Related Products */}
            {!!relatedProducts.length && (
              <SectionCard>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">You Might Also Like</h3>
                    <Link
                      href="/products"
                      className="text-sm font-semibold text-rose-600 hover:text-rose-700 transition"
                    >
                      View All →
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {relatedProducts.slice(0, 6).map((rp, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <Link href={`/product/${rp.id}`} className="group">
                          <div className="relative aspect-square rounded-xl overflow-hidden border border-gray-100">
                            <Image
                              src={getProductImageUrl(rp) || "/placeholder.svg?height=200&width=200&query=related"}
                              alt={rp.name}
                              fill
                              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                              className="object-cover w-full h-full group-hover:scale-105 transition duration-300"
                            />
                            {rp.sale_price && rp.sale_price < rp.price && (
                              <div className="absolute top-2 left-2 bg-rose-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
                                -{Math.round(((rp.price - rp.sale_price) / rp.price) * 100)}%
                              </div>
                            )}
                          </div>
                          <h4 className="text-sm font-semibold text-gray-900 mt-2 line-clamp-2 group-hover:text-rose-600 transition">
                            {rp.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-sm font-semibold text-rose-600">
                              {formatPrice(rp.sale_price || rp.price)}
                            </p>
                            {rp.sale_price && rp.sale_price < rp.price && (
                              <p className="text-xs text-gray-400 line-through">{formatPrice(rp.price)}</p>
                            )}
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </SectionCard>
            )}
          </motion.div>

          {/* RIGHT: Price + Purchase - major UI improvements and orange color scheme */}
          <motion.div {...appleVariants.fadeIn} className="lg:col-span-5">
            <div className="sticky top-6 space-y-6">
              <SectionCard>
                <div className="p-6">
                  <h1 className="text-2xl font-bold text-gray-900 mb-4 lg:block hidden">{product?.name}</h1>

                  {/* Pricing Section - Better organized */}
                  <div className="mb-6 pb-6 border-b border-gray-100">
                    <div className="flex items-end gap-3 mb-4">
                      <span className="text-4xl font-bold text-gray-900">{formatPrice(currentPrice)}</span>
                      {currentPrice < originalPrice && (
                        <span className="text-gray-500 line-through text-lg font-medium">
                          {formatPrice(originalPrice)}
                        </span>
                      )}
                      {discountPercentage > 0 && (
                        <span className="text-sm font-bold bg-orange-600 text-white px-3 py-1 rounded-full">
                          Save {discountPercentage}%
                        </span>
                      )}
                    </div>
                    <div
                      className={cn(
                        "inline-flex items-center px-4 py-2 text-sm font-semibold rounded-full border",
                        stockDisplay.cls,
                      )}
                      aria-live="polite"
                    >
                      <stockDisplay.icon className={cn("h-5 w-5 mr-2", stockDisplay.ic)} />
                      {stockDisplay.text}
                      {inventoryData?.last_updated && (
                        <span className="ml-2 text-xs text-gray-500">
                          • Updated {new Date(inventoryData.last_updated).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delivery Benefits - Better organized grid */}
                  <div className="mb-6 grid grid-cols-1 gap-3">
                    {[
                      { icon: Truck, title: "Fast Delivery", desc: "From KSh 150 | Free over KSh 3,000" },
                      { icon: Clock, title: "Express Dispatch", desc: "Same-day for orders before 2pm" },
                      { icon: RefreshCw, title: "Easy Returns", desc: "14-day hassle-free returns" },
                    ].map((it, i) => (
                      <motion.div
                        key={i}
                        className="flex items-start gap-3 p-3 rounded-lg bg-orange-50/40 border border-orange-100/50 hover:border-orange-200 transition"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <it.icon className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900">{it.title}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{it.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Variants Section */}
                  {product?.variants?.length > 0 && (
                    <div className="mb-6 pb-6 border-b border-gray-100 space-y-4">
                      {Array.from(new Set(product.variants.map((v: any) => v.color))).filter(Boolean).length > 0 && (
                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-2">Color</label>
                          <div className="flex flex-wrap gap-2">
                            {(Array.from(new Set(product.variants.map((v: any) => v.color))) as string[])
                              .filter(Boolean)
                              .map((color, i) => {
                                const active = selectedVariant?.color === color
                                return (
                                  <motion.button
                                    key={i}
                                    onClick={() => {
                                      const v = product.variants.find((x: any) => x.color === color)
                                      if (v) handleVariantSelection(v)
                                    }}
                                    className={cn(
                                      "px-4 h-10 rounded-lg text-sm font-semibold transition",
                                      active
                                        ? "bg-orange-600 text-white shadow-md"
                                        : "bg-white border border-gray-200 hover:border-orange-300 hover:bg-orange-50",
                                    )}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                  >
                                    {color}
                                  </motion.button>
                                )
                              })}
                          </div>
                        </div>
                      )}
                      {Array.from(new Set(product.variants.map((v: any) => v.size))).filter(Boolean).length > 0 && (
                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-2">Size</label>
                          <div className="flex flex-wrap gap-2">
                            {(Array.from(new Set(product.variants.map((v: any) => v.size))) as string[])
                              .filter(Boolean)
                              .map((size, i) => {
                                const active = selectedVariant?.size === size
                                return (
                                  <motion.button
                                    key={i}
                                    onClick={() => {
                                      const v = product.variants.find((x: any) => x.size === size)
                                      if (v) handleVariantSelection(v)
                                    }}
                                    className={cn(
                                      "px-4 h-10 rounded-lg text-sm font-semibold transition",
                                      active
                                        ? "bg-orange-600 text-white shadow-md"
                                        : "bg-white border border-gray-200 hover:border-orange-300 hover:bg-orange-50",
                                    )}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                  >
                                    {size}
                                  </motion.button>
                                )
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quantity Selector */}
                  <div className="mb-6 pb-6 border-b border-gray-100">
                    <label className="block text-sm font-semibold text-gray-900 mb-3">Quantity</label>
                    <div className="inline-flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                      <motion.button
                        aria-label="Decrease quantity"
                        className="w-12 h-12 flex items-center justify-center text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Minus className="h-5 w-5" />
                      </motion.button>
                      <div className="w-16 h-12 flex items-center justify-center bg-white border-l border-r border-gray-200">
                        <span className="font-semibold text-gray-900">{quantity}</span>
                      </div>
                      <motion.button
                        aria-label="Increase quantity"
                        className="w-12 h-12 flex items-center justify-center text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition"
                        onClick={() => setQuantity((q) => Math.min(inventoryData?.available_quantity || 0, q + 1))}
                        disabled={!inventoryData?.is_in_stock || quantity >= (inventoryData?.available_quantity || 0)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Plus className="h-5 w-5" />
                      </motion.button>
                    </div>
                    {inventoryData && inventoryData.available_quantity > 0 && (
                      <p className="text-xs text-gray-500 mt-2">Max available: {inventoryData.available_quantity}</p>
                    )}
                  </div>

                  {/* Call-to-Action Buttons */}
                  <div className="space-y-3 mb-6">
                    <motion.button
                      onClick={handleAddToCart}
                      disabled={isAddingToCart || !inventoryData?.is_in_stock}
                      className={cn(
                        "group relative w-full h-12 rounded-xl text-white text-base font-bold transition-all duration-200 flex items-center justify-center gap-2 overflow-hidden",
                        isAddingToCart || !inventoryData?.is_in_stock
                          ? "bg-gray-300 cursor-not-allowed"
                          : "bg-[#FF4500] hover:bg-[#E63E00] active:bg-[#CC3700] shadow-[0_4px_14px_0_rgba(255,69,0,0.39)] hover:shadow-[0_6px_20px_rgba(255,69,0,0.5)] active:shadow-[0_2px_8px_rgba(255,69,0,0.3)]",
                      )}
                      whileHover={inventoryData?.is_in_stock ? { scale: 1.01 } : {}}
                      whileTap={inventoryData?.is_in_stock ? { scale: 0.98 } : {}}
                    >
                      {/* Subtle inner highlight for realistic depth */}
                      <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                      {isAddingToCart ? (
                        <>
                          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>Adding to Cart...</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart
                            className="h-5 w-5 transition-transform group-hover:scale-110"
                            strokeWidth={2.5}
                          />
                          <span>{inventoryData?.is_in_stock ? "Add to Cart" : "Out of Stock"}</span>
                        </>
                      )}
                    </motion.button>

                    <motion.button
                      className={cn(
                        "w-full h-12 rounded-xl text-white text-base font-bold transition-all flex items-center justify-center gap-2",
                        isAddingToCart || !inventoryData?.is_in_stock
                          ? "bg-gray-300 cursor-not-allowed"
                          : "bg-gradient-to-r from-[#25D366] to-[#1ebe57] hover:from-[#20BA58] hover:to-[#1aa34a] shadow-lg hover:shadow-xl active:shadow-md",
                      )}
                      onClick={handleBuyViaWhatsApp}
                      disabled={isAddingToCart || !inventoryData?.is_in_stock}
                      whileHover={inventoryData?.is_in_stock ? { scale: 1.02, y: -2 } : {}}
                      whileTap={inventoryData?.is_in_stock ? { scale: 0.98, y: 0 } : {}}
                    >
                      <FaWhatsapp className="h-6 w-6" />
                      <span>Buy via WhatsApp</span>
                    </motion.button>
                  </div>

                  {/* Payment Options */}
                  <div className="p-4 rounded-lg bg-orange-50/50 border border-orange-100">
                    <p className="text-sm font-semibold text-gray-900 mb-2">Secure Payment Options</p>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <CreditCard className="h-4 w-4 flex-shrink-0" />
                      <span>Visa • Mastercard • M-Pesa • Airtel Money</span>
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Trust Signals */}
              <SectionCard>
                <div className="p-6 grid grid-cols-2 gap-4">
                  <motion.div
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-orange-50/50 transition"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Shield className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">100% Genuine</p>
                      <p className="text-xs text-gray-500 mt-0.5">Verified quality</p>
                    </div>
                  </motion.div>
                  <motion.div
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-orange-50/50 transition"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <RefreshCw className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Easy Returns</p>
                      <p className="text-xs text-gray-500 mt-0.5">14-day guarantee</p>
                    </div>
                  </motion.div>
                </div>
              </SectionCard>
            </div>
          </motion.div>
        </div>

        {/* Low Stock Warning - Better visibility */}
        {inventoryData && inventoryData.available_quantity > 0 && inventoryData.available_quantity <= 10 && (
          <motion.div {...appleVariants.fadeIn} className="mt-6 p-4 bg-amber-50 rounded-lg border-l-4 border-amber-500">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <p className="text-sm font-semibold text-amber-800">
                ⚡ Only {inventoryData.available_quantity} left in stock — order soon!
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Mobile Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg lg:hidden z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <motion.button
            onClick={handleAddToCart}
            disabled={isAddingToCart || !inventoryData?.is_in_stock}
            className={cn(
              "group relative flex-1 h-12 rounded-xl text-white text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 overflow-hidden",
              isAddingToCart || !inventoryData?.is_in_stock
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-[#FF4500] hover:bg-[#E63E00] active:bg-[#CC3700] shadow-[0_4px_14px_0_rgba(255,69,0,0.39)] hover:shadow-[0_6px_20px_rgba(255,69,0,0.5)] active:shadow-[0_2px_8px_rgba(255,69,0,0.3)]",
            )}
            whileTap={inventoryData?.is_in_stock ? { scale: 0.95 } : {}}
          >
            {/* Subtle inner highlight for realistic depth */}
            <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            {isAddingToCart ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Adding...</span>
              </>
            ) : (
              <>
                <ShoppingCart className="h-5 w-5 transition-transform group-hover:scale-110" strokeWidth={2.5} />
                <span>{inventoryData?.is_in_stock ? "Add to Cart" : "Out of Stock"}</span>
              </>
            )}
          </motion.button>

          <motion.button
            className={cn(
              "flex-1 h-12 rounded-xl text-white text-sm font-bold transition-all flex items-center justify-center gap-2",
              isAddingToCart || !inventoryData?.is_in_stock
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-gradient-to-r from-[#25D366] to-[#1ebe57] hover:from-[#20BA58] hover:to-[#1aa34a] shadow-lg active:shadow-md",
            )}
            onClick={handleBuyViaWhatsApp}
            disabled={isAddingToCart || !inventoryData?.is_in_stock}
            whileTap={inventoryData?.is_in_stock ? { scale: 0.95 } : {}}
          >
            <FaWhatsapp className="h-5 w-5" />
            <span>WhatsApp</span>
          </motion.button>
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>

      <ImageZoomModal
        product={product}
        isOpen={isImageZoomModalOpen}
        onClose={() => setIsImageZoomModalOpen(false)}
        selectedImageIndex={zoomSelectedImage}
      />
    </div>
  )
}
