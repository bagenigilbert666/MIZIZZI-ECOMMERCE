"use client"

import React, { memo, useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2, CheckCircle2, XCircle, Edit, Eye, MoreHorizontal } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"
import { OptimizedImage } from "@/components/ui/optimized-image"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Memoized callbacks to prevent unnecessary re-renders
  const handleSelect = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect(product.id)
  }, [product.id, onSelect])

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(product.id)
    setIsMenuOpen(false)
  }, [product.id, onDelete])

  const handleView = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(`/admin/products/${product.id}`)
    setIsMenuOpen(false)
  }, [product.id, router])

  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(`/admin/products/${product.id}/edit`)
    setIsMenuOpen(false)
  }, [product.id, router])

  const status = product.status === "active" || product.is_active
  const stockStatus = (product.stock || 0) > 0

  return (
    <TableRow 
      className="hover:bg-gray-50 transition-colors border-b border-gray-200"
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
        <div className="font-medium text-gray-900 line-clamp-2">{product.name}</div>
        <div className="text-xs text-gray-500 mt-0.5">{product.sku || "No SKU"}</div>
      </TableCell>
      <TableCell className="text-right font-semibold text-gray-900">${parseFloat(String(product.price || 0)).toFixed(2)}</TableCell>
      <TableCell className="text-right text-gray-700">{product.stock || 0} units</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {status ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-xs text-green-700 font-medium">Active</span>
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500">Inactive</span>
            </>
          )}
        </div>
      </TableCell>
      <TableCell>
        {stockStatus ? (
          <Badge className="bg-green-50 text-green-700 border border-green-200 text-xs">In Stock</Badge>
        ) : (
          <Badge className="bg-red-50 text-red-700 border border-red-200 text-xs">Out of Stock</Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
              title="Product actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            side="bottom" 
            sideOffset={4}
            alignOffset={-4}
            className="w-48"
            collisionPadding={8}
          >
            <DropdownMenuLabel className="text-xs font-semibold text-gray-700">Actions</DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem 
                onClick={handleView}
                className="cursor-pointer focus:bg-blue-50 focus:text-blue-600"
              >
                <Eye className="mr-2 h-4 w-4" />
                <span>View Details</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleEdit}
                className="cursor-pointer focus:bg-amber-50 focus:text-amber-600"
              >
                <Edit className="mr-2 h-4 w-4" />
                <span>Edit Product</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem 
              onClick={handleDelete}
              className="cursor-pointer focus:bg-red-50 focus:text-red-600 text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
})

ProductRow.displayName = "ProductRow"

export { ProductRow }
