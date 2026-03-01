"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { AlertTriangle, Loader, Trash2 } from "lucide-react"
import { websocketService } from "@/services/websocket"
import { useSWRConfig } from "swr"
import { categoryService } from "@/services/category"

interface Category {
  id: number
  name: string
  slug: string
  description?: string
  image_url?: string
  banner_url?: string
  is_featured: boolean
  sort_order: number
  is_active?: boolean
}

interface CategoryDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: Category | null
  onDeleteSuccess: () => void
}

export function CategoryDeleteDialog({
  open,
  onOpenChange,
  category,
  onDeleteSuccess,
}: CategoryDeleteDialogProps) {
  const { toast } = useToast()
  const { mutate } = useSWRConfig()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!category) return

    try {
      setDeleting(true)
      const token = localStorage.getItem("admin_token") || localStorage.getItem("mizizzi_token")
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

      const response = await fetch(`${baseUrl}/api/admin/shop-categories/categories/${category.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to delete category")
      }

      toast({
        title: "Success",
        description: `"${category.name}" has been deleted successfully`,
      })

      await websocketService.emit("category_updated", {
        type: "deleted",
        category: { id: category.id },
      })

      onOpenChange(false)
      onDeleteSuccess()
      categoryService.clearCache()
      mutate((key: any) => typeof key === "string" && key.includes("categories"), undefined, { revalidate: true })
    } catch (error) {
      console.error("Error deleting category:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete category",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        {/* Header with Icon */}
        <DialogHeader>
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-red-50">
              <AlertTriangle className="h-6 w-6 sm:h-7 sm:w-7 text-red-600" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Delete Category?</h2>
          </div>
        </DialogHeader>

        {/* Body - Warning message */}
        <DialogBody>
          <div className="text-center space-y-2">
            {category && (
              <>
                <p className="text-sm sm:text-base text-gray-600">
                  You're about to permanently delete{" "}
                  <span className="font-semibold text-gray-900">"{category.name}"</span>
                </p>
                <p className="text-xs sm:text-sm text-gray-500">
                  This action cannot be undone. All associated data will be removed.
                </p>
              </>
            )}
          </div>
        </DialogBody>

        {/* Footer - Action buttons */}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
            className="h-10 sm:h-11 px-4 sm:px-6 rounded-lg font-medium text-sm border-gray-200 hover:bg-gray-50"
          >
            Keep Category
          </Button>
          <Button
            onClick={handleDelete}
            disabled={deleting}
            className="h-10 sm:h-11 px-4 sm:px-6 rounded-lg font-medium text-sm bg-red-600 hover:bg-red-700 text-white gap-2"
          >
            {deleting ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
