"use client"

import React, { useState, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { Product } from "@/types"

interface ProductBasicInfoProps {
  product: Product
  onProductChange: (updates: Partial<Product>) => void
}

export function ProductBasicInfo({ product, onProductChange }: ProductBasicInfoProps) {
  const handleChange = useCallback(
    (field: keyof Product, value: any) => {
      onProductChange({ [field]: value })
    },
    [onProductChange]
  )

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
      {/* Product Name */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">Product Name</label>
        <Input
          value={product.name || ""}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="Enter product name"
          className="border-gray-300 rounded-lg"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">Description</label>
        <Textarea
          value={product.description || ""}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Enter detailed product description"
          rows={4}
          className="border-gray-300 rounded-lg resize-none"
        />
      </div>

      {/* Short Description */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">Short Description</label>
        <Textarea
          value={product.short_description || ""}
          onChange={(e) => handleChange("short_description", e.target.value)}
          placeholder="Enter short description (for product list views)"
          rows={2}
          className="border-gray-300 rounded-lg resize-none"
        />
      </div>

      {/* SKU */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">SKU</label>
        <Input
          value={product.sku || ""}
          onChange={(e) => handleChange("sku", e.target.value)}
          placeholder="Enter SKU"
          className="border-gray-300 rounded-lg"
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">Category</label>
        <Input
          value={typeof product.category === "string" ? product.category : (product.category as any)?.name || ""}
          disabled
          className="border-gray-300 rounded-lg bg-gray-50"
        />
      </div>

      {/* Brand */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">Brand</label>
        <Input
          value={typeof product.brand === "string" ? product.brand : (product.brand as any)?.name || ""}
          disabled
          className="border-gray-300 rounded-lg bg-gray-50"
        />
      </div>

      {/* SEO Title */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">SEO Title</label>
        <Input
          value={product.seo_title || ""}
          onChange={(e) => handleChange("seo_title", e.target.value)}
          placeholder="Enter SEO title"
          className="border-gray-300 rounded-lg"
        />
      </div>

      {/* SEO Description */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">SEO Description</label>
        <Textarea
          value={product.seo_description || ""}
          onChange={(e) => handleChange("seo_description", e.target.value)}
          placeholder="Enter SEO description"
          rows={2}
          className="border-gray-300 rounded-lg resize-none"
        />
      </div>
    </div>
  )
}
