"use client"

import React, { useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Star, Zap, TrendingUp, Crown } from "lucide-react"
import type { Product } from "@/types"

interface ProductActionsProps {
  product: Product
  onProductChange: (updates: Partial<Product>) => void
}

export function ProductActions({ product, onProductChange }: ProductActionsProps) {
  const handleToggle = useCallback(
    (field: keyof Product) => {
      onProductChange({ [field]: !(product[field] as boolean) })
    },
    [product, onProductChange]
  )

  const isActive = product.status === "active" || product.is_active

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 sticky top-24">
      {/* Status */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Status</h3>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            {isActive ? "Active" : "Inactive"}
          </span>
          <Switch
            checked={isActive}
            onCheckedChange={() =>
              onProductChange({
                status: isActive ? "inactive" : "active",
              })
            }
          />
        </div>
      </div>

      {/* Features */}
      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Features</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">Featured</span>
            </div>
            <Switch
              checked={product.is_featured || false}
              onCheckedChange={() => handleToggle("is_featured")}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">New Product</span>
            </div>
            <Switch
              checked={product.is_new || false}
              onCheckedChange={() => handleToggle("is_new")}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">Flash Sale</span>
            </div>
            <Switch
              checked={product.is_flash_sale || false}
              onCheckedChange={() => handleToggle("is_flash_sale")}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">Luxury Deal</span>
            </div>
            <Switch
              checked={product.is_luxury_deal || false}
              onCheckedChange={() => handleToggle("is_luxury_deal")}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">Trending</span>
            </div>
            <Switch
              checked={(product as any).is_trending || false}
              onCheckedChange={() => handleToggle("is_trending" as any)}
            />
          </div>
        </div>
      </div>

      {/* Product Stats */}
      {(product.rating || product.total_sales || product.views) && (
        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Statistics</h3>
          <div className="space-y-2 text-sm">
            {product.rating && (
              <div className="flex justify-between">
                <span className="text-gray-600">Rating</span>
                <span className="font-medium">{product.rating.toFixed(1)} / 5</span>
              </div>
            )}
            {product.total_sales !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-600">Sales</span>
                <span className="font-medium">{product.total_sales}</span>
              </div>
            )}
            {product.views !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-600">Views</span>
                <span className="font-medium">{product.views}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Visibility */}
      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Visibility</h3>
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          {(product.visibility || "public").charAt(0).toUpperCase() + (product.visibility || "public").slice(1)}
        </Badge>
      </div>
    </div>
  )
}
