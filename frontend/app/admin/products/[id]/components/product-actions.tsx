"use client"

import React, { useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Star, Zap, TrendingUp, Crown, Gift, Calendar, Sparkles, Target } from "lucide-react"
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
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 sticky top-24 max-h-[calc(100vh-100px)] overflow-y-auto">
      {/* Status */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Status</h3>
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="text-sm font-medium text-gray-600">
            {isActive ? "🟢 Active" : "⚪ Inactive"}
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

      {/* Features Section */}
      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Collection Features</h3>
        <div className="space-y-3">
          {/* Featured */}
          <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <Star className="h-4 w-4 text-yellow-500 flex-shrink-0" />
              <span className="text-sm text-gray-700 truncate">Featured</span>
            </div>
            <Switch
              checked={product.is_featured || false}
              onCheckedChange={() => handleToggle("is_featured")}
              className="flex-shrink-0"
            />
          </div>

          {/* New Product */}
          <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <Gift className="h-4 w-4 text-blue-500 flex-shrink-0" />
              <span className="text-sm text-gray-700 truncate">New Arrivals</span>
            </div>
            <Switch
              checked={product.is_new || false}
              onCheckedChange={() => handleToggle("is_new")}
              className="flex-shrink-0"
            />
          </div>

          {/* Flash Sale */}
          <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <Zap className="h-4 w-4 text-orange-500 flex-shrink-0" />
              <span className="text-sm text-gray-700 truncate">Flash Sale</span>
            </div>
            <Switch
              checked={product.is_flash_sale || false}
              onCheckedChange={() => handleToggle("is_flash_sale")}
              className="flex-shrink-0"
            />
          </div>

          {/* Luxury Deal */}
          <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <Crown className="h-4 w-4 text-purple-500 flex-shrink-0" />
              <span className="text-sm text-gray-700 truncate">Luxury Deal</span>
            </div>
            <Switch
              checked={product.is_luxury_deal || false}
              onCheckedChange={() => handleToggle("is_luxury_deal")}
              className="flex-shrink-0"
            />
          </div>

          {/* Trending Now */}
          <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <TrendingUp className="h-4 w-4 text-red-500 flex-shrink-0" />
              <span className="text-sm text-gray-700 truncate">Trending Now</span>
            </div>
            <Switch
              checked={(product as any).is_trending || false}
              onCheckedChange={() => handleToggle("is_trending" as any)}
              className="flex-shrink-0"
            />
          </div>

          {/* Top Picks */}
          <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="h-4 w-4 text-amber-500 flex-shrink-0" />
              <span className="text-sm text-gray-700 truncate">Top Picks</span>
            </div>
            <Switch
              checked={(product as any).is_top_pick || false}
              onCheckedChange={() => handleToggle("is_top_pick" as any)}
              className="flex-shrink-0"
            />
          </div>

          {/* Daily Finds */}
          <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <Calendar className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span className="text-sm text-gray-700 truncate">Daily Finds</span>
            </div>
            <Switch
              checked={(product as any).is_daily_find || false}
              onCheckedChange={() => handleToggle("is_daily_find" as any)}
              className="flex-shrink-0"
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
              <div className="flex justify-between p-2 rounded bg-gray-50">
                <span className="text-gray-600">Rating</span>
                <span className="font-medium text-gray-900">{product.rating.toFixed(1)} / 5 ⭐</span>
              </div>
            )}
            {product.total_sales !== undefined && (
              <div className="flex justify-between p-2 rounded bg-gray-50">
                <span className="text-gray-600">Sales</span>
                <span className="font-medium text-gray-900">{product.total_sales}</span>
              </div>
            )}
            {product.views !== undefined && (
              <div className="flex justify-between p-2 rounded bg-gray-50">
                <span className="text-gray-600">Views</span>
                <span className="font-medium text-gray-900">{product.views}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Visibility */}
      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Visibility</h3>
        <Badge className="bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
          {(product.visibility || "public").charAt(0).toUpperCase() + (product.visibility || "public").slice(1)}
        </Badge>
      </div>
    </div>
  )
}
