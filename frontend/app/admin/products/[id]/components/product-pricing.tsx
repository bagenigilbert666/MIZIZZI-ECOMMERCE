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
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
      {/* Regular Price */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">Regular Price</label>
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-gray-400" />
          <Input
            type="number"
            min="0"
            step="0.01"
            value={product.price || ""}
            onChange={(e) => handleChange("price", e.target.value)}
            placeholder="0.00"
            className="border-gray-300 rounded-lg"
          />
        </div>
      </div>

      {/* Sale Price */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">Sale Price</label>
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-gray-400" />
          <Input
            type="number"
            min="0"
            step="0.01"
            value={product.sale_price || ""}
            onChange={(e) => handleChange("sale_price", e.target.value)}
            placeholder="Leave empty for no sale"
            className="border-gray-300 rounded-lg"
          />
        </div>
        {discount > 0 && (
          <p className="text-sm text-green-600 mt-2">Discount: {discount}%</p>
        )}
      </div>

      {/* Cost Price */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">Cost Price</label>
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-gray-400" />
          <Input
            type="number"
            min="0"
            step="0.01"
            value={product.cost_price || ""}
            onChange={(e) => handleChange("cost_price", e.target.value)}
            placeholder="Leave empty if not applicable"
            className="border-gray-300 rounded-lg"
          />
        </div>
      </div>

      {/* Profit Calculation */}
      {product.cost_price && product.price && (
        <div className="rounded-lg bg-blue-50 p-3 border border-blue-200">
          <p className="text-sm font-medium text-blue-900">
            Profit Margin: {Math.round(((product.price - product.cost_price) / product.price) * 100)}%
          </p>
        </div>
      )}
    </div>
  )
}
