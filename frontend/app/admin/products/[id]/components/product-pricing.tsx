"use client"

import React, { useCallback } from "react"
import { Input } from "@/components/ui/input"
import { DollarSign } from "lucide-react"
import type { Product } from "@/types"

interface ProductPricingProps {
  product: Product
  onProductChange: (updates: Partial<Product>) => void
}

export function ProductPricing({ product, onProductChange }: ProductPricingProps) {
  const handleChange = useCallback(
    (field: "price" | "sale_price" | "cost_price", value: string) => {
      const numValue = value === "" ? null : Number.parseFloat(value)
      onProductChange({ [field]: numValue })
    },
    [onProductChange]
  )

  const discount = product.sale_price
    ? Math.round(((product.price - product.sale_price) / product.price) * 100)
    : 0

  return (
    <div className="space-y-4">
      {/* Price Grid - Mobile Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Regular Price */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Regular Price</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="number"
              min="0"
              step="0.01"
              value={product.price || ""}
              onChange={(e) => handleChange("price", e.target.value)}
              placeholder="0.00"
              className="pl-8 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Sale Price */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Sale Price</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="number"
              min="0"
              step="0.01"
              value={product.sale_price || ""}
              onChange={(e) => handleChange("sale_price", e.target.value)}
              placeholder="Leave empty for no sale"
              className="pl-8 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {discount > 0 && (
            <p className="text-sm text-orange-600 font-medium mt-2">Discount: {discount}%</p>
          )}
        </div>
      </div>

      {/* Cost Price */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">Cost Price</label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="number"
            min="0"
            step="0.01"
            value={product.cost_price || ""}
            onChange={(e) => handleChange("cost_price", e.target.value)}
            placeholder="Leave empty if not applicable"
            className="pl-8 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Profit Calculation Card */}
      {product.cost_price && product.price && (
        <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 p-4 border border-blue-200">
          <p className="text-sm font-semibold text-blue-900">
            💰 Profit Margin: {Math.round(((product.price - product.cost_price) / product.price) * 100)}%
          </p>
          <p className="text-xs text-blue-700 mt-1">Per unit profit: ${((product.price - product.cost_price) as any).toFixed(2)}</p>
        </div>
      )}
    </div>
  )
}
