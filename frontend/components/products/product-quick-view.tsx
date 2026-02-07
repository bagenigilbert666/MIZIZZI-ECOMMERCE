"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  X,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  ShoppingCart,
  Heart,
  Share2,
  ExternalLink,
  Zap,
  Tag,
  Truck,
  ShieldCheck,
  RotateCcw,
  Check,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Product } from "./products-page"
import { getProductImageUrl, calculateDiscount } from "./products-page"

/* ─── Props ─── */
interface ProductQuickViewProps {
  product: Product | null
  open: boolean
  onClose: () => void
}

/* ─── Main Component ─── */
export function ProductQuickView({ product, open, onClose }: ProductQuickViewProps) {
  const [activeImgIdx, setActiveImgIdx] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [wished, setWished] = useState(false)
  const [addedToCart, setAddedToCart] = useState(false)
  const [imgTransitioning, setImgTransitioning] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  // Lock scroll on open, reset state
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
      setActiveImgIdx(0)
      setQuantity(1)
      setAddedToCart(false)
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  // Escape key handler
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
      if (!product) return
      if (e.key === "ArrowLeft") navigateImg("prev")
      if (e.key === "ArrowRight") navigateImg("next")
    }
    if (open) window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [open, onClose, product])

  // Build image list
  const images: string[] = []
  if (product) {
    const primary = getProductImageUrl(product)
    images.push(primary)
    if (product.image_urls) {
      product.image_urls.forEach((url) => {
        if (typeof url === "string" && url.startsWith("http") && url !== primary) {
          images.push(url)
        }
      })
    }
  }

  const navigateImg = useCallback(
    (direction: "prev" | "next") => {
      if (images.length <= 1) return
      setImgTransitioning(true)
      setTimeout(() => {
        setActiveImgIdx((p) => {
          if (direction === "prev") return p === 0 ? images.length - 1 : p - 1
          return p === images.length - 1 ? 0 : p + 1
        })
        setImgTransitioning(false)
      }, 150)
    },
    [images.length]
  )

  const handleAddToCart = () => {
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }

  if (!open || !product) return null

  const discount = calculateDiscount(product.price, product.sale_price)
  const currentPrice = product.sale_price || product.price
  const savedAmount = product.sale_price ? product.price - product.sale_price : 0

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Quick view of ${product.name}`}
    >
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50 backdrop-blur-[6px]"
        style={{ animation: "fadeIn 0.2s ease" }}
      />

      {/* Modal container */}
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl max-h-[92vh] bg-white rounded-2xl shadow-2xl overflow-hidden"
        style={{ animation: "quickViewIn 0.35s cubic-bezier(0.22, 1, 0.36, 1)" }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/70">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Quick View
          </span>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-200 transition-colors"
            aria-label="Close quick view"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col md:flex-row overflow-y-auto max-h-[calc(92vh-52px)]">
          {/* ─── Left: Image Gallery ─── */}
          <div className="md:w-[45%] flex-shrink-0 bg-gray-50">
            {/* Main Image */}
            <div className="relative aspect-square">
              <Image
                src={images[activeImgIdx] || getProductImageUrl(product)}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 100vw, 45vw"
                className={cn(
                  "object-cover transition-all duration-200",
                  imgTransitioning ? "opacity-0 scale-[0.98]" : "opacity-100 scale-100"
                )}
                priority
              />

              {/* Discount badge */}
              {discount > 0 && (
                <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                  <span className="inline-flex items-center gap-1 bg-[#8B1538] text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-lg">
                    <Zap className="h-3 w-3" />
                    -{discount}%
                  </span>
                  {discount >= 30 && (
                    <span className="inline-block bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-md">
                      HOT DEAL
                    </span>
                  )}
                </div>
              )}

              {/* Navigation arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => navigateImg("prev")}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 shadow-md flex items-center justify-center hover:bg-white hover:scale-105 transition-all"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-4 w-4 text-gray-700" />
                  </button>
                  <button
                    onClick={() => navigateImg("next")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 shadow-md flex items-center justify-center hover:bg-white hover:scale-105 transition-all"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-4 w-4 text-gray-700" />
                  </button>
                </>
              )}

              {/* Image counter */}
              {images.length > 1 && (
                <div className="absolute bottom-3 right-3 bg-black/60 text-white text-[10px] font-medium px-2 py-1 rounded-full backdrop-blur-sm">
                  {activeImgIdx + 1} / {images.length}
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto">
                {images.slice(0, 6).map((img, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (i !== activeImgIdx) {
                        setImgTransitioning(true)
                        setTimeout(() => {
                          setActiveImgIdx(i)
                          setImgTransitioning(false)
                        }, 150)
                      }
                    }}
                    className={cn(
                      "relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all duration-200",
                      i === activeImgIdx
                        ? "border-[#8B1538] shadow-md ring-1 ring-[#8B1538]/20"
                        : "border-gray-200 opacity-60 hover:opacity-100 hover:border-gray-300"
                    )}
                  >
                    <Image
                      src={img || "/placeholder.svg"}
                      alt={`Product image ${i + 1}`}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ─── Right: Product Details ─── */}
          <div className="md:w-[55%] flex flex-col p-5 sm:p-6 overflow-y-auto">
            {/* Category */}
            {product.category && (
              <span className="inline-block text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-2">
                {product.category}
              </span>
            )}

            {/* Product name */}
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 leading-snug mb-4 text-pretty">
              {product.name}
            </h2>

            {/* Price block */}
            <div className="mb-5 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-baseline gap-2.5 flex-wrap">
                <span className="text-2xl sm:text-3xl font-bold text-[#8B1538]">
                  KSh {currentPrice.toLocaleString()}
                </span>
                {product.sale_price && (
                  <span className="text-sm text-gray-400 line-through">
                    KSh {product.price.toLocaleString()}
                  </span>
                )}
              </div>
              {savedAmount > 0 && (
                <div className="mt-2 flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-600">
                    You save KSh {savedAmount.toLocaleString()} ({discount}% off)
                  </span>
                </div>
              )}
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              <div className="flex flex-col items-center gap-1 py-2 px-1 bg-gray-50 rounded-lg">
                <Truck className="h-4 w-4 text-gray-500" />
                <span className="text-[9px] sm:text-[10px] text-gray-500 font-medium text-center leading-tight">
                  Fast Delivery
                </span>
              </div>
              <div className="flex flex-col items-center gap-1 py-2 px-1 bg-gray-50 rounded-lg">
                <ShieldCheck className="h-4 w-4 text-gray-500" />
                <span className="text-[9px] sm:text-[10px] text-gray-500 font-medium text-center leading-tight">
                  Genuine Product
                </span>
              </div>
              <div className="flex flex-col items-center gap-1 py-2 px-1 bg-gray-50 rounded-lg">
                <RotateCcw className="h-4 w-4 text-gray-500" />
                <span className="text-[9px] sm:text-[10px] text-gray-500 font-medium text-center leading-tight">
                  Easy Returns
                </span>
              </div>
            </div>

            {/* Quantity selector */}
            <div className="flex items-center gap-3 mb-5">
              <span className="text-sm text-gray-600 font-medium">Quantity</span>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-3.5 w-3.5 text-gray-600" />
                </button>
                <span className="w-12 text-center text-sm font-semibold text-gray-800 select-none tabular-nums">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                  disabled={quantity >= 10}
                  className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-3.5 w-3.5 text-gray-600" />
                </button>
              </div>
              {quantity > 1 && (
                <span className="text-xs text-gray-400">
                  Total: KSh {(currentPrice * quantity).toLocaleString()}
                </span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2.5 mt-auto">
              {/* Add to Cart */}
              <button
                onClick={handleAddToCart}
                className={cn(
                  "jumia-add-btn w-full py-3 font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-all duration-300",
                  addedToCart
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-[#8B1538] hover:bg-[#6B1028] text-white"
                )}
              >
                {addedToCart ? (
                  <>
                    <Check className="h-4 w-4" />
                    Added to Cart
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4" />
                    Add to Cart
                  </>
                )}
              </button>

              {/* Secondary actions row */}
              <div className="flex gap-2">
                <button
                  onClick={() => setWished(!wished)}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 border transition-all duration-200",
                    wished
                      ? "border-[#8B1538] bg-[#8B1538]/5 text-[#8B1538]"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  )}
                >
                  <Heart
                    className={cn("h-4 w-4", wished && "fill-current")}
                  />
                  <span className="hidden sm:inline">
                    {wished ? "Wishlisted" : "Wishlist"}
                  </span>
                </button>

                <button
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
                  aria-label="Share product"
                >
                  <Share2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Share</span>
                </button>
              </div>

              {/* View full details link */}
              <Link
                href={`/product/${product.slug || product.id}`}
                className="group w-full py-2.5 text-sm font-medium text-[#8B1538] flex items-center justify-center gap-1.5 hover:underline transition-all"
                onClick={onClose}
              >
                View Full Product Details
                <ExternalLink className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Inline keyframes for modal animation */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes quickViewIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
