"use client"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import type { DroppableProvided, DroppableStateSnapshot, DraggableProvided, DraggableStateSnapshot } from "@hello-pangea/dnd"
import { GripVertical, Trash2, Eye, EyeOff } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"

interface Banner {
  id?: string
  title: string
  image_url: string
  order: number
  is_active: boolean
}

interface CategoryBannersGalleryProps {
  banners: Banner[]
  onBannersChange: (banners: Banner[]) => void
  onRemove: (bannerId: string | undefined) => void
}

export function CategoryBannersGallery({ banners, onBannersChange, onRemove }: CategoryBannersGalleryProps) {
  const handleDragEnd = (result: DropResult) => {
    const { source, destination } = result

    if (!destination || (source.index === destination.index && source.droppableId === destination.droppableId)) {
      return
    }

    const newBanners = Array.from(banners)
    const [reorderedBanner] = newBanners.splice(source.index, 1)
    newBanners.splice(destination.index, 0, reorderedBanner)

    // Update order numbers
    const updatedBanners = newBanners.map((banner, index) => ({
      ...banner,
      order: index,
    }))

    onBannersChange(updatedBanners)
  }

  const toggleActive = (bannerId: string | undefined) => {
    if (!bannerId) return

    const updatedBanners = banners.map((banner) =>
      banner.id === bannerId ? { ...banner, is_active: !banner.is_active } : banner,
    )

    onBannersChange(updatedBanners)
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="banners">
        {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={`space-y-2 p-4 rounded-lg transition-colors ${snapshot.isDraggingOver ? "bg-blue-50" : "bg-transparent"}`}
          >
            {banners.map((banner, index) => (
              <Draggable key={banner.id} draggableId={banner.id || `banner-${index}`} index={index}>
                {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={`flex items-center gap-3 p-3 border rounded-lg bg-white transition-shadow ${snapshot.isDragging ? "shadow-lg" : "shadow-sm"}`}
                  >
                    <div {...provided.dragHandleProps} className="text-gray-400 hover:text-gray-600 cursor-grab">
                      <GripVertical className="h-4 w-4" />
                    </div>

                    <div className="relative w-16 h-16 flex-shrink-0 bg-gray-100 rounded">
                      {banner.image_url && (
                        <Image
                          src={banner.image_url || "/placeholder.svg"}
                          alt={banner.title}
                          fill
                          className="object-cover rounded"
                        />
                      )}
                    </div>

                    <div className="flex-1">
                      <p className="font-medium text-sm">{banner.title}</p>
                      <p className="text-xs text-gray-500">Position: {index + 1}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleActive(banner.id)}
                        title={banner.is_active ? "Hide" : "Show"}
                      >
                        {banner.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onRemove(banner.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  )
}
