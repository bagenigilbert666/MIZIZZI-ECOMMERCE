"use client"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { Trash2, Loader } from "lucide-react"
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
      <AlertDialogContent className="max-w-sm rounded-2xl border-border/50">
        <AlertDialogHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <Trash2 className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <AlertDialogTitle className="text-2xl">Delete Category?</AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            You're about to delete <span className="font-semibold text-foreground">"{category?.name}"</span>
            <br />
            <span className="text-sm">This action cannot be undone.</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col-reverse gap-3 sm:flex-row pt-4">
          <AlertDialogCancel className="h-11 rounded-lg font-medium text-base" disabled={deleting}>
            Keep Category
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="h-11 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 font-medium text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Category"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
