"use client"

import React, { useCallback, useState } from "react"
import { Image as ImageIcon, X, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { OptimizedImage } from "@/components/ui/optimized-image"
import type { Product } from "@/types"

interface ProductImagesProps {
  product: Product
  onProductChange: (updates: Partial<Product>) => void
}

export function ProductImages({ product, onProductChange }: ProductImagesProps) {
  const [newImageUrl, setNewImageUrl] = useState("")
  const [isAdding, setIsAdding] = useState(false)

  const images = product.image_urls || []

  const handleAddImage = useCallback(() => {
    if (newImageUrl.trim()) {
      onProductChange({
        image_urls: [...images, newImageUrl],
      })
      setNewImageUrl("")
      setIsAdding(false)
    }
  }, [newImageUrl, images, onProductChange])

  const handleRemoveImage = useCallback(
    (index: number) => {
      onProductChange({
        image_urls: images.filter((_, i) => i !== index),
      })
    },
    [images, onProductChange]
  )

  const handleSetThumbnail = useCallback(
    (index: number) => {
      onProductChange({
        thumbnail_url: images[index],
      })
    },
    [images, onProductChange]
  )

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
      {/* Gallery Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((url, index) => (
            <div
              key={index}
              className="group relative aspect-square rounded-lg bg-gray-100 overflow-hidden border-2 border-gray-200 hover:border-blue-400"
            >
              <OptimizedImage
                src={url}
                alt={`Product image ${index + 1}`}
                className="w-full h-full"
                priority={index === 0}
              />

              {/* Overlay Actions */}
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                {product.thumbnail_url !== url && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleSetThumbnail(index)}
                    className="rounded-full text-xs"
                  >
                    Set Thumbnail
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleRemoveImage(index)}
                  className="rounded-full"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>

              {product.thumbnail_url === url && (
                <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                  Thumbnail
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Image Section */}
      {!isAdding && (
        <Button
          variant="outline"
          onClick={() => setIsAdding(true)}
          className="w-full rounded-lg border-dashed border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Image
        </Button>
      )}

      {isAdding && (
        <div className="space-y-2 p-4 rounded-lg bg-gray-50 border border-gray-200">
          <div className="flex gap-2">
            <Input
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              placeholder="Enter image URL"
              className="rounded-lg"
            />
            <Button
              onClick={handleAddImage}
              disabled={!newImageUrl.trim()}
              className="rounded-lg"
            >
              Add
            </Button>
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              setIsAdding(false)
              setNewImageUrl("")
            }}
            className="w-full rounded-lg"
          >
            Cancel
          </Button>
        </div>
      )}

      {images.length === 0 && !isAdding && (
        <div className="py-8 text-center">
          <ImageIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No images yet</p>
        </div>
      )}
    </div>
  )
}
