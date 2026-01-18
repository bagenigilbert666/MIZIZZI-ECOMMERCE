"use client"

import { useState, memo } from "react"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import type { Product } from "@/types"

interface PromoProductCardProps {
  product: Product
  badgeText?: string
}

export const PromoProductCard = memo(function PromoProductCard({ product, badgeText }: PromoProductCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false)

  const colorOptions = Array.isArray(product.color_options) ? (product.color_options as string[]) : []
  const hasMoreColors = colorOptions.length > 3
  const displayColors = colorOptions.slice(0, 3)
  const additionalColors = hasMoreColors ? colorOptions.length - 3 : 0

  const isOnSale = !!product.sale_price && product.sale_price < product.price
  const discountPct =
    isOnSale && product.price > 0
      ? Math.round(((product.price - (product.sale_price as number)) / product.price) * 100)
      : 0

  const imageSrc =
    (product.image_urls && product.image_urls[0]) ||
    product.thumbnail_url ||
    "/generic-product-placeholder.png"

  return (
    <Link href={`/product/${product.id}`} prefetch={false}>
      <Card className="group h-full overflow-hidden rounded-none border-0 bg-white shadow-none transition-all duration-200 hover:shadow-md active:scale-[0.99]">
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
          {!imageLoaded && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}
          <Image
            src={imageSrc || "/placeholder.svg"}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-200 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
          />
          {badgeText && (
            <div className="absolute left-0 top-2 bg-cherry-900 px-2 py-1 text-[10px] font-semibold text-white">
              {badgeText}
            </div>
          )}
          {isOnSale && !badgeText && (
            <div className="absolute left-0 top-2 bg-cherry-900 px-2 py-1 text-[10px] font-semibold text-white">
              {discountPct}% OFF
            </div>
          )}
        </div>

        <CardContent className="space-y-1.5 p-2">
          <div className="mb-1">
            <span className="inline-block rounded-sm bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
              {typeof product.category === "object" && product.category
                ? product.category.name
                : (product as any).category || (product as any).category_id || "Mizizzi Collection"}
            </span>
          </div>

          <h3 className="line-clamp-2 min-h-[2.5rem] text-xs font-medium leading-tight text-gray-600 group-hover:text-gray-900">
            {product.name}
          </h3>

          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-semibold text-gray-900">
              KSh {((product.sale_price as number) || product.price).toLocaleString()}
            </span>
            {isOnSale && (
              <span className="text-[11px] text-gray-500 line-through">KSh {product.price.toLocaleString()}</span>
            )}
          </div>

          {colorOptions.length > 0 && (
            <div className="mt-1 flex items-center gap-1">
              {displayColors.map((color, index) => (
                <div
                  key={`${color}-${index}`}
                  className="h-4 w-4 rounded-full border border-gray-200"
                  style={{ backgroundColor: color.toLowerCase?.() || color }}
                  aria-label={`Color ${color}`}
                  title={color}
                />
              ))}
              {hasMoreColors && <span className="text-[10px] text-gray-500">+{additionalColors}</span>}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
})
