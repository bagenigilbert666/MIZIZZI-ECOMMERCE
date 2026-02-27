"use client"

import React, { useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Package } from "lucide-react"
import type { Product } from "@/types"

interface ProductInventoryProps {
  product: Product
  onProductChange: (updates: Partial<Product>) => void
}

export function ProductInventory({ product, onProductChange }: ProductInventoryProps) {
  const handleChange = useCallback(
    (field: "stock" | "low_stock_threshold", value: string) => {
      const numValue = value === "" ? null : Number.parseInt(value)
      onProductChange({ [field]: numValue })
    },
    [onProductChange]
  )

  const stock = product.stock || 0
  const threshold = product.low_stock_threshold || 10

  let stockStatus: "in_stock" | "low_stock" | "out_of_stock"
  if (stock === 0) {
    stockStatus = "out_of_stock"
  } else if (stock <= threshold) {
    stockStatus = "low_stock"
  } else {
    stockStatus = "in_stock"
  }

  const statusColors = {
    in_stock: "bg-green-50 text-green-700 border-green-200",
    low_stock: "bg-yellow-50 text-yellow-700 border-yellow-200",
    out_of_stock: "bg-red-50 text-red-700 border-red-200",
  }

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
      {/* Stock Quantity */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">Stock Quantity</label>
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-gray-400" />
          <Input
            type="number"
            min="0"
            value={stock}
            onChange={(e) => handleChange("stock", e.target.value)}
            placeholder="0"
            className="border-gray-300 rounded-lg"
          />
        </div>
      </div>

      {/* Low Stock Threshold */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">Low Stock Threshold</label>
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-gray-400" />
          <Input
            type="number"
            min="0"
            value={threshold}
            onChange={(e) => handleChange("low_stock_threshold", e.target.value)}
            placeholder="10"
            className="border-gray-300 rounded-lg"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Alert when stock falls below this number
        </p>
      </div>

      {/* Stock Status */}
      <div className={`rounded-lg border p-4 ${statusColors[stockStatus]}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium capitalize">{stockStatus.replace("_", " ")}</p>
            <p className="text-sm opacity-90">
              {stock} {stock === 1 ? "unit" : "units"} available
            </p>
          </div>
          <Badge variant="secondary" className={statusColors[stockStatus]}>
            {stockStatus.replace("_", " ")}
          </Badge>
        </div>
      </div>
    </div>
  )
}
