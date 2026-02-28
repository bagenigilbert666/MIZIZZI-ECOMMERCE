"use client"

import React, { memo, useCallback, useRef, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Trash2, Edit, Eye, MoreHorizontal, CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { OptimizedImage } from "@/components/ui/optimized-image"
import { useToast } from "@/hooks/use-toast"
import { adminService } from "@/services/admin"
import type { Product } from "@/types"
import { formatPrice } from "@/lib/utils"

interface ProductCardProps {
  product: Product
  isSelected: boolean
  onSelect: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onView: (id: string) => void
  imageSrc?: string
}

interface MenuItem {
  label: string
  icon: React.ReactNode
  onClick: () => void
  color?: "default" | "danger"
  disabled?: boolean
}

const ProductCard = memo(function ProductCard({
  product,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onView,
  imageSrc,
}: ProductCardProps) {
  const { toast } = useToast()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteSuccess, setDeleteSuccess] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Memoized callbacks
  const handleSelect = useCallback(() => {
    onSelect(product.id)
  }, [product.id, onSelect])

  const handleEdit = useCallback(async () => {
    setIsLoading(true)
    try {
      await onEdit(product.id)
    } finally {
      setIsLoading(false)
    }
  }, [product.id, onEdit])

  const handleView = useCallback(async () => {
    setIsLoading(true)
    try {
      await onView(product.id)
    } finally {
      setIsLoading(false)
    }
  }, [product.id, onView])

  const handleDeleteClick = useCallback(() => {
    setShowDeleteDialog(true)
    setIsMenuOpen(false)
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    setIsDeleting(true)
    try {
      await adminService.deleteProduct(String(product.id))
      
      setDeleteSuccess(true)
      
      toast({
        title: "Success",
        description: `"${product.name}" has been deleted successfully`,
        variant: "success",
        duration: 3000,
      })
      
      setTimeout(() => {
        setShowDeleteDialog(false)
        setIsDeleting(false)
        setDeleteSuccess(false)
        onDelete(String(product.id))
      }, 1500)
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to delete product"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
        duration: 4000,
      })
      setIsDeleting(false)
      setDeleteSuccess(false)
    }
  }, [product.id, product.name, onDelete, toast])

  // Close menu when clicking outside
  useEffect(() => {
    if (!isMenuOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        triggerRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside, true)
    return () => document.removeEventListener("mousedown", handleClickOutside, true)
  }, [isMenuOpen])

  // Close menu on escape key
  useEffect(() => {
    if (!isMenuOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isMenuOpen])

  const status = product.status === "active" || (("is_active" in product) ? Boolean((product as any).is_active) : false)
  const stockStatus = (product.stock || 0) > 0

  const menuItems: MenuItem[] = [
    {
      label: "View Details",
      icon: <Eye className="w-4 h-4" />,
      onClick: handleView,
      disabled: isLoading,
    },
    {
      label: "Edit Product",
      icon: <Edit className="w-4 h-4" />,
      onClick: handleEdit,
      disabled: isLoading,
    },
    {
      label: "Delete",
      icon: <Trash2 className="w-4 h-4" />,
      onClick: handleDeleteClick,
      color: "danger",
      disabled: isLoading,
    },
  ]

  return (
    <>
      <Card className="overflow-visible h-full shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200">
        <CardContent className="p-4 h-full flex flex-col">
          {/* Header - Checkbox and Menu */}
          <div className="flex items-start justify-between mb-3">
            <Checkbox checked={isSelected} onChange={handleSelect} className="mt-0.5" />
            <Button
              ref={triggerRef}
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-blue-500 transition-all"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              title="Product actions"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MoreHorizontal className="h-4 w-4" />
              )}
            </Button>

            {/* Custom Portal Menu */}
            {isMenuOpen && createPortal(
              <div
                ref={menuRef}
                className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 animate-in fade-in slide-in-from-top-1 duration-150"
                onClick={(e) => e.stopPropagation()}
                role="menu"
                aria-orientation="vertical"
                style={{
                  position: 'fixed',
                  top: triggerRef.current ? triggerRef.current.getBoundingClientRect().bottom + 8 : 0,
                  right: triggerRef.current ? window.innerWidth - triggerRef.current.getBoundingClientRect().right : 0,
                  width: '192px'
                }}
              >
                <div className="px-3 py-2 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </div>
                {menuItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      item.onClick()
                      if (!isLoading) {
                        setIsMenuOpen(false)
                      }
                    }}
                    disabled={item.disabled}
                    className={`
                      w-full px-3 py-2 text-sm flex items-center gap-3 transition-colors
                      ${item.color === "danger" 
                        ? "text-red-600 hover:bg-red-50 disabled:text-red-400" 
                        : "text-gray-700 hover:bg-blue-50 disabled:text-gray-400"
                      }
                      ${item.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                    `}
                    role="menuitem"
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    <span className="flex-1 text-left">{item.label}</span>
                  </button>
                ))}
              </div>,
              document.body
            )}

            {/* Backdrop */}
            {isMenuOpen && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsMenuOpen(false)}
              />
            )}
          </div>

          {/* Product Image - Better styling */}
          <div className="w-full h-32 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 mb-3 overflow-hidden flex-shrink-0 border border-gray-200">
            {imageSrc ? (
              <OptimizedImage
                src={imageSrc}
                alt={product.name}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                width={160}
                height={128}
              />
            ) : (
              <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                <Eye className="h-8 w-8 text-gray-400" />
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-2 flex-grow">
            <div>
              <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm leading-tight">{product.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">SKU: {product.sku || "N/A"}</p>
            </div>

            {/* Price and Stock - Enhanced layout */}
            <div className="grid grid-cols-2 gap-2 py-2 rounded-lg bg-gray-50 px-2">
              <div className="flex flex-col">
                <p className="text-xs text-gray-500 font-medium">Price</p>
                <p className="font-bold text-gray-900 text-sm">{formatPrice(product.price)}</p>
              </div>
              <div className="flex flex-col border-l border-gray-200 pl-2">
                <p className="text-xs text-gray-500 font-medium">Stock</p>
                <p className="font-bold text-gray-900 text-sm">{product.stock || 0}</p>
              </div>
            </div>
          </div>

          {/* Status Badges - Enhanced styling */}
          <div className="flex flex-col gap-2 pt-3 mt-auto border-t border-gray-100">
            <div className="flex gap-1.5 flex-wrap">
              {status ? (
                <Badge className="bg-green-50 text-green-700 border border-green-200 text-xs py-0.5 px-2 font-medium">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Active
                </Badge>
              ) : (
                <Badge className="bg-yellow-50 text-yellow-700 border border-yellow-200 text-xs py-0.5 px-2 font-medium">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Inactive
                </Badge>
              )}

              {stockStatus ? (
                <Badge className="bg-green-50 text-green-700 border border-green-200 text-xs py-0.5 px-2 font-medium">
                  In Stock
                </Badge>
              ) : (
                <Badge className="bg-red-50 text-red-700 border border-red-200 text-xs py-0.5 px-2 font-medium">
                  Out of Stock
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            {deleteSuccess ? (
              <div className="px-6 py-10 flex flex-col items-center justify-center">
                <div className="rounded-full bg-green-100 p-4 mb-4">
                  <CheckCircle2 className="w-10 h-10 text-green-600 animate-in zoom-in duration-300" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 text-center">Product Deleted</h2>
                <p className="text-sm text-gray-600 text-center mt-2">"{product.name}" has been removed</p>
              </div>
            ) : (
              <>
                <div className="px-6 py-4 border-b border-gray-200 bg-red-50">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    Delete Product?
                  </h2>
                </div>
                <div className="px-6 py-4">
                  <p className="text-sm text-gray-700 mb-2">
                    Are you sure you want to delete <span className="font-semibold">"{product.name}"</span>?
                  </p>
                  <p className="text-xs text-gray-500">This action cannot be undone.</p>
                </div>
                <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteDialog(false)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
})

ProductCard.displayName = "ProductCard"

export { ProductCard }
