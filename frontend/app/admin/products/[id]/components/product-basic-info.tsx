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
    <div className="space-y-4">
      {/* Product Name */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">Product Name</label>
        <Input
          value={product.name || ""}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="Enter product name"
          className="border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">Description</label>
        <Textarea
          value={product.description || ""}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Enter detailed product description"
          rows={4}
          className="border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Short Description */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">Short Description</label>
        <Textarea
          value={product.short_description || ""}
          onChange={(e) => handleChange("short_description", e.target.value)}
          placeholder="Enter short description (for product list views)"
          rows={2}
          className="border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Grid Row - SKU, Category, Brand */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* SKU */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">SKU</label>
          <Input
            value={product.sku || ""}
            onChange={(e) => handleChange("sku", e.target.value)}
            placeholder="Enter SKU"
            className="border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Category</label>
          <Input
            value={typeof product.category === "string" ? product.category : (product.category as any)?.name || ""}
            disabled
            className="border-gray-300 rounded-lg bg-gray-50 text-gray-500"
          />
        </div>
      </div>

      {/* Brand */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">Brand</label>
        <Input
          value={typeof product.brand === "string" ? product.brand : (product.brand as any)?.name || ""}
          disabled
          className="border-gray-300 rounded-lg bg-gray-50 text-gray-500"
        />
      </div>

      {/* SEO Section */}
      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Search Engine Optimization</h3>
        
        {/* SEO Title */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-900 mb-2">SEO Title</label>
          <Input
            value={product.seo_title || ""}
            onChange={(e) => handleChange("seo_title", e.target.value)}
            placeholder="Enter SEO title (max 60 characters)"
            maxLength={60}
            className="border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">{(product.seo_title || "").length}/60</p>
        </div>

        {/* SEO Description */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">SEO Description</label>
          <Textarea
            value={product.seo_description || product.meta_description || ""}
            onChange={(e) => handleChange("seo_description" as any, e.target.value)}
            placeholder="Enter SEO description (max 160 characters)"
            maxLength={160}
            rows={3}
            className="border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">{(product.seo_description || product.meta_description || "").length}/160</p>
        </div>

        {/* SEO Keywords */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">SEO Keywords</label>
          <Input
            value={Array.isArray(product.seo_keywords) ? product.seo_keywords.join(", ") : ""}
            onChange={(e) => handleChange("seo_keywords" as any, e.target.value.split(",").map(k => k.trim()))}
            placeholder="Enter keywords separated by commas"
            className="border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Separate keywords with commas</p>
        </div>
      </div>
    </div>
  )
}
