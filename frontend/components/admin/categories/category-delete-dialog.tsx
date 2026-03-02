"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
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
        description: "Category deleted successfully",
      })

      await websocketService.emit("category_updated", {
        type: "deleted",
        category: { id: category.id },
      })

      categoryService.clearCache()
      mutate((key: any) => typeof key === "string" && key.includes("categories"), undefined, { revalidate: true })

      onOpenChange(false)
      onDeleteSuccess()
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
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      footer={
        <div className="flex gap-3 w-full">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
            className="flex-1 h-10 rounded-lg font-medium"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 h-10 rounded-lg font-medium gap-2"
          >
            {deleting ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col items-center text-center py-2">
        {/* Alert Icon */}
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 animate-pulse">
          <AlertTriangle className="h-8 w-8 text-red-600" />
        </div>

        {/* Title */}
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Delete Category?</h3>

        {/* Message */}
        <p className="text-sm text-gray-600 mb-1">
          You're about to permanently delete
        </p>
        <p className="text-base font-semibold text-gray-900 break-words mb-4">
          "{category?.name}"
        </p>

        {/* Warning */}
        <div className="w-full p-3 rounded-lg bg-red-50 border border-red-200 mb-4">
          <p className="text-xs text-red-700 font-medium">
            ⚠️ This action cannot be undone. All data associated with this category will be permanently deleted.
          </p>
        </div>
      </div>
    </Modal>
  )
}
