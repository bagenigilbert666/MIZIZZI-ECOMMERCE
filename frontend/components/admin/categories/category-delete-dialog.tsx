"use client"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { Trash2, Loader, AlertTriangle } from "lucide-react"
import { useState } from "react"
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
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.removeItem("categories")
      }

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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[90vw] max-w-sm rounded-2xl border-border/50 p-0 gap-0 sm:rounded-2xl">
        {/* Header with Icon */}
        <div className="flex flex-col items-center pt-8 px-6 pb-4">
          <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center mb-4 animate-in fade-in zoom-in-95">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <AlertDialogTitle className="text-2xl text-center">Delete Category?</AlertDialogTitle>
        </div>

        {/* Content */}
        <div className="px-6 py-4 border-t border-border/30">
          <AlertDialogDescription className="text-center text-sm leading-relaxed">
            <p className="mb-2">
              You're about to delete <span className="font-semibold text-foreground">"{category?.name}"</span>
            </p>
            <p className="text-xs text-muted-foreground">This action cannot be undone and will remove the category from your store.</p>
          </AlertDialogDescription>
        </div>

        {/* Footer Actions */}
        <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row pt-0 px-6 pb-6 border-t border-border/30">
          <AlertDialogCancel 
            disabled={deleting}
            className="h-10 rounded-lg font-medium text-sm bg-muted hover:bg-muted/80 text-foreground border-0"
          >
            Keep Category
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="h-10 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all gap-2 flex items-center justify-center border-0"
          >
            {deleting ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
