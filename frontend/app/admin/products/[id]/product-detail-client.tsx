"use client"

import React, { useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Trash2, Save, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { adminService } from "@/services/admin"
import type { Product } from "@/types"
import { ProductBasicInfo } from "./components/product-basic-info"
import { ProductPricing } from "./components/product-pricing"
import { ProductInventory } from "./components/product-inventory"
import { ProductImages } from "./components/product-images"
import { ProductActions } from "./components/product-actions"

interface ProductDetailClientProps {
  initialProduct: Product
}

export function ProductDetailClient({ initialProduct }: ProductDetailClientProps) {
  const router = useRouter()
  const [product, setProduct] = useState<Product>(initialProduct)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Track changes
  const handleProductChange = useCallback((updatedProduct: Partial<Product>) => {
    setProduct((prev) => ({ ...prev, ...updatedProduct }))
    setHasChanges(true)
  }, [])

  // Save product changes
  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true)
      await adminService.updateProduct(product.id.toString(), product)
      setHasChanges(false)
      toast({
        title: "Success",
        description: "Product updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save product",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }, [product])

  // Delete product
  const handleDelete = useCallback(async () => {
    try {
      setIsDeleting(true)
      await adminService.deleteProduct(product.id.toString())
      toast({
        title: "Success",
        description: "Product deleted successfully",
      })
      router.push("/admin/products")
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete product",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }, [product.id, router])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Sticky */}
      <div className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4">
            <div className="flex items-center gap-4 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="rounded-full hover:bg-gray-100 flex-shrink-0"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 truncate">{product.name}</h1>
                <p className="text-sm text-gray-500 truncate">SKU: {product.sku || "N/A"}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {hasChanges && (
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="rounded-full bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                title="View product"
              >
                <Eye className="h-5 w-5" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                className="rounded-full"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Apple-like Two Column Layout */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3" style={{ contain: "layout" }}>
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6" style={{ contain: "content" }}>
            {/* Product Images */}
            <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6" style={{ contain: "layout" }}>
              <h2 className="text-lg font-semibold text-gray-900">Gallery</h2>
              <ProductImages product={product} onProductChange={handleProductChange} />
            </section>

            {/* Basic Information */}
            <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6" style={{ contain: "layout" }}>
              <h2 className="text-lg font-semibold text-gray-900">Information</h2>
              <ProductBasicInfo product={product} onProductChange={handleProductChange} />
            </section>

            {/* Pricing */}
            <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6" style={{ contain: "layout" }}>
              <h2 className="text-lg font-semibold text-gray-900">Pricing</h2>
              <ProductPricing product={product} onProductChange={handleProductChange} />
            </section>

            {/* Inventory */}
            <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6" style={{ contain: "layout" }}>
              <h2 className="text-lg font-semibold text-gray-900">Inventory</h2>
              <ProductInventory product={product} onProductChange={handleProductChange} />
            </section>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6 lg:sticky lg:top-24" style={{ contain: "layout" }}>
            <ProductActions product={product} onProductChange={handleProductChange} />
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="rounded-2xl bg-white p-6 sm:p-8 max-w-sm w-full shadow-2xl">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Delete Product?</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-6">
              This action cannot be undone. The product "{product.name}" will be permanently deleted from your catalog.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="rounded-full"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-full"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

            {/* Delete Section - Bottom */}
            {showDeleteConfirm && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
                <p className="text-sm font-medium text-red-900">
                  Are you sure you want to delete this product? This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1"
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
