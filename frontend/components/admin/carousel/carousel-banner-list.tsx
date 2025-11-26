"use client"

import type React from "react"

import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Edit2, Trash2, Eye, EyeOff, GripVertical, Copy, Calendar, BarChart3 } from "lucide-react"
import Image from "next/image"
import { useState } from "react"
import type { CarouselBanner } from "@/types/carousel-admin"

interface CarouselBannerListProps {
  banners: CarouselBanner[]
  isLoading: boolean
  onEdit: (banner: CarouselBanner) => void
  onDelete: (id: number) => void
  onToggleActive: (banner: CarouselBanner) => void
  onPreview: (banner: CarouselBanner) => void
  onReorder?: (banners: CarouselBanner[]) => void
  onDuplicate?: (banner: CarouselBanner) => void
}

export function CarouselBannerList({
  banners,
  isLoading,
  onEdit,
  onDelete,
  onToggleActive,
  onPreview,
  onReorder,
  onDuplicate,
}: CarouselBannerListProps) {
  const [draggedId, setDraggedId] = useState<number | null>(null)
  const [orderedBanners, setOrderedBanners] = useState(banners)
  const [hoveredBanner, setHoveredBanner] = useState<number | null>(null)

  const handleDragStart = (id: number) => {
    setDraggedId(id)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (targetId: number) => {
    if (!draggedId || draggedId === targetId) return

    const draggedIndex = orderedBanners.findIndex((b) => b.id === draggedId)
    const targetIndex = orderedBanners.findIndex((b) => b.id === targetId)

    const newBanners = [...orderedBanners]
    const [draggedBanner] = newBanners.splice(draggedIndex, 1)
    newBanners.splice(targetIndex, 0, draggedBanner)

    setOrderedBanners(newBanners)
    setDraggedId(null)

    if (onReorder) {
      onReorder(newBanners)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (orderedBanners.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-64 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <BarChart3 className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-semibold mb-2">No carousel banners found</p>
          <p className="text-sm text-muted-foreground">Create your first banner to get started</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {orderedBanners.map((banner, index) => (
          <motion.div
            key={banner.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ delay: index * 0.05 }}
            draggable
            onDragStart={() => handleDragStart(banner.id)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(banner.id)}
            onMouseEnter={() => setHoveredBanner(banner.id)}
            onMouseLeave={() => setHoveredBanner(null)}
            className={`cursor-move transition-all ${draggedId === banner.id ? "opacity-50 scale-95" : ""}`}
          >
            <Card
              className={`overflow-hidden hover:shadow-lg transition-all duration-300 ${
                draggedId === banner.id ? "ring-2 ring-primary shadow-xl" : ""
              }`}
            >
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Drag Handle */}
                  <div className="flex items-center justify-center flex-shrink-0">
                    <GripVertical className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
                  </div>

                  <div className="relative w-32 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-muted group">
                    <Image
                      src={banner.image_url || "/placeholder.svg"}
                      alt={banner.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    {hoveredBanner === banner.id && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-black/60 flex items-center justify-center"
                      >
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onPreview(banner)}
                          className="text-xs gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          Preview
                        </Button>
                      </motion.div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold truncate text-lg">{banner.name}</h3>
                        <p className="text-sm text-muted-foreground truncate">{banner.title}</p>
                      </div>

                      <div className="flex gap-2 flex-shrink-0">
                        <Badge variant={banner.is_active ? "default" : "secondary"} className="font-medium">
                          {banner.is_active ? "Active" : "Inactive"}
                        </Badge>
                        {banner.priority && banner.priority > 0 && (
                          <Badge variant="outline" className="gap-1">
                            <BarChart3 className="h-3 w-3" />
                            {banner.priority}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {banner.badge_text && (
                        <Badge variant="secondary" className="text-xs">
                          {banner.badge_text}
                        </Badge>
                      )}
                      {banner.discount && (
                        <Badge variant="destructive" className="text-xs">
                          {banner.discount}
                        </Badge>
                      )}
                      {banner.start_date && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Calendar className="h-3 w-3" />
                          Scheduled
                        </Badge>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onToggleActive(banner)}
                        className="gap-1"
                        title={banner.is_active ? "Deactivate" : "Activate"}
                      >
                        {banner.is_active ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        {banner.is_active ? "Hide" : "Show"}
                      </Button>
                      {onDuplicate && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDuplicate(banner)}
                          className="gap-1"
                          title="Duplicate"
                        >
                          <Copy className="h-3 w-3" />
                          Duplicate
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => onEdit(banner)} className="gap-1" title="Edit">
                        <Edit2 className="h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDelete(banner.id)}
                        className="gap-1 text-destructive hover:text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
