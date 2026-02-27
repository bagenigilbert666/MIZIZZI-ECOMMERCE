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
    <div className="space-y-4">
      {/* Stock Grid - Mobile Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Stock Quantity */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Stock Quantity</label>
          <div className="relative">
            <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="number"
              min="0"
              value={stock}
              onChange={(e) => handleChange("stock", e.target.value)}
              placeholder="0"
              className="pl-10 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Low Stock Threshold */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Low Stock Threshold</label>
          <div className="relative">
            <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="number"
              min="0"
              value={threshold}
              onChange={(e) => handleChange("low_stock_threshold", e.target.value)}
              placeholder="10"
              className="pl-10 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Alert when stock falls below this</p>
        </div>
      </div>

      {/* Stock Status Card */}
      <div className={`rounded-xl border p-4 sm:p-5 ${statusColors[stockStatus]}`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold capitalize text-lg">{stockStatus.replace("_", " ")}</p>
            <p className="text-sm opacity-90 mt-1">
              {stock} {stock === 1 ? "unit" : "units"} available
            </p>
          </div>
          <div className="text-3xl font-bold opacity-20">
            {stockStatus === "in_stock" && "✓"}
            {stockStatus === "low_stock" && "⚠"}
            {stockStatus === "out_of_stock" && "✕"}
          </div>
        </div>
      </div>

      {/* Stock Information */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
        <div className="p-3 rounded-lg bg-gray-50 text-center">
          <p className="text-xs text-gray-600 font-medium mb-1">Current Stock</p>
          <p className="text-2xl font-bold text-gray-900">{stock}</p>
        </div>
        <div className="p-3 rounded-lg bg-gray-50 text-center">
          <p className="text-xs text-gray-600 font-medium mb-1">Threshold</p>
          <p className="text-2xl font-bold text-gray-900">{threshold}</p>
        </div>
        <div className="p-3 rounded-lg bg-gray-50 text-center">
          <p className="text-xs text-gray-600 font-medium mb-1">Above Threshold</p>
          <p className="text-2xl font-bold text-gray-900">{Math.max(0, stock - threshold)}</p>
        </div>
      </div>
    </div>
  )
}
