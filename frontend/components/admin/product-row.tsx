"use client"

import React, { memo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Trash2, CheckCircle2, XCircle } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { TableCell, TableRow } from "@/components/ui/table"
import { OptimizedImage } from "@/components/ui/optimized-image"
import { Badge } from "@/components/ui/badge"
import type { Product } from "@/types"

interface ProductRowProps {
  product: Product
  isSelected: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  imageSrc?: string
}

const ProductRow = memo(function ProductRow({
  product,
  isSelected,
  onSelect,
  onDelete,
  imageSrc,
}: ProductRowProps) {
  const router = useRouter()

  // Memoized callbacks to prevent unnecessary re-renders
  const handleSelect = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect(product.id)
  }, [product.id, onSelect])

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(product.id)
  }, [product.id, onDelete])

  const handleRowClick = useCallback(() => {
    router.push(`/admin/products/${product.id}`)
  }, [product.id, router])

  const status = product.status === "active" || product.is_active
  const stockStatus = (product.stock || 0) > 0

  return (
    <TableRow 
      className="hover:bg-blue-50 transition-colors cursor-pointer group"
      onClick={handleRowClick}
    >
      <TableCell className="w-12" onClick={handleSelect}>
        <Checkbox checked={isSelected} onChange={() => {}} />
      </TableCell>
      <TableCell className="w-16">
        <div className="w-14 h-14 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
          {imageSrc ? (
            <OptimizedImage
              src={imageSrc}
              alt={product.name}
              className="w-full h-full object-cover"
              width={56}
              height={56}
            />
          ) : (
            <div className="w-full h-full bg-gray-200" />
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="font-medium text-gray-900 line-clamp-1 group-hover:text-blue-600">{product.name}</div>
        <div className="text-sm text-gray-500">{product.sku || "No SKU"}</div>
      </TableCell>
      <TableCell className="text-right">${parseFloat(String(product.price || 0)).toFixed(2)}</TableCell>
      <TableCell className="text-right">{product.stock || 0} units</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {status ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-600">Active</span>
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">Inactive</span>
            </>
          )}
        </div>
      </TableCell>
      <TableCell>
        {stockStatus ? (
          <Badge className="bg-green-50 text-green-700 border border-green-200">In Stock</Badge>
        ) : (
          <Badge className="bg-red-50 text-red-700 border border-red-200">Out of Stock</Badge>
        )}
      </TableCell>
      <TableCell 
        className="text-right"
        onClick={(e) => {
          e.stopPropagation()
          handleDelete(e as any)
        }}
      >
        <button
          onClick={handleDelete}
          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete product"
        >
          <Trash2 className="h-4 w-4 text-red-600" />
        </button>
      </TableCell>
    </TableRow>
  )
})

ProductRow.displayName = "ProductRow"

export { ProductRow }
